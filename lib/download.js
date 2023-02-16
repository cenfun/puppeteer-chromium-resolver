const EC = require('eight-colors');
const Util = require('./util.js');

const cleanLocalRevisions = async (options, browserFetcher) => {
    let localRevisions = await browserFetcher.localRevisions();
    if (!Util.isList(localRevisions)) {
        return;
    }

    localRevisions = localRevisions.filter((revision) => revision !== options.revision);
    if (localRevisions.length > options.cacheRevisions) {
        localRevisions.sort();
        localRevisions.length -= options.cacheRevisions;
        Util.output(`Removing previous useless revisions ${localRevisions.join(', ')}`);
        const cleanupOldVersions = localRevisions.map((revision) => browserFetcher.remove(revision));
        await Promise.all(cleanupOldVersions);
    }

};

const downloadFromHost = async (options, host) => {
    Util.output(`Downloading from: ${host} ...`);
    const browserFetcher = Util.createBrowserFetcher({
        host: host,
        path: options.snapshotsDir
    });

    const gauge = Util.createGauge();

    let failed = false;
    const revisionInfo = await browserFetcher.download(options.revision, (downloadedBytes, totalBytes) => {
        Util.showProgress(gauge, downloadedBytes, totalBytes);
    }).catch((error) => {
        failed = true;
        Util.output(error, true);
    });

    Util.closeGauge(gauge);

    if (failed || !revisionInfo) {
        return;
    }

    Util.output(`Chromium downloaded: ${revisionInfo.folderPath}`);

    await cleanLocalRevisions(options, browserFetcher);

    return revisionInfo;

};

// =========================================================================================

const downloadStart = async (options, list) => {

    for (const item of list) {
        const revisionInfo = await downloadFromHost(options, item.host);
        if (revisionInfo) {
            return revisionInfo;
        }
    }

    if (options.retryNum < options.retry) {
        options.retryNum += 1;
        Util.output('Retry Chromium downloading ... ');
        return downloadStart(options, list);
    }
};

// =========================================================================================

const preDownloadFromHost = async (options, host) => {
    const browserFetcher = Util.createBrowserFetcher({
        host: host,
        path: options.snapshotsDir
    });

    const info = browserFetcher.revisionInfo(options.revision);
    const url = info.url;

    const time_start = Date.now();

    const ok = await Util.headRequest(url);

    // canDownload has issue for now
    // const ok = await browserFetcher.canDownload(options.revision);

    const time = Date.now() - time_start;

    const available = ok ? EC.green(ok) : EC.red(ok);
    Util.output(`HEAD request: ${url} - ${available} (${time}ms)`);

    return {
        host,
        time,
        ok
    };
};

const preDownloadStart = async (options, hosts) => {
    const list = [];
    for (const host of hosts) {
        const info = await preDownloadFromHost(options, host);
        list.push(info);
    }

    // sort list
    list.sort((a, b) => {
        // ok first
        if (a.ok && !b.ok) {
            return -1;
        }
        if (!a.ok && b.ok) {
            return 1;
        }
        // time small first
        return a.time - b.time;
    });
    // console.log(list);

    return list;
};

// =========================================================================================

const getHosts = (options) => {
    let hosts = options.hosts;
    if (!Util.isList(hosts)) {
        // default hosts
        hosts = ['https://storage.googleapis.com', 'https://npmmirror.com/mirrors'];
    }
    return hosts;
};

// =========================================================================================

module.exports = async (options) => {

    const hosts = getHosts(options);

    const list = await preDownloadStart(options, hosts);

    options.retryNum = 0;
    const revisionInfo = await downloadStart(options, list);
    // console.log(revisionInfo);
    if (revisionInfo) {
        options.revisionInfo = revisionInfo;
    } else {
        Util.output(`ERROR: Failed to download Chromium after retry ${options.retryNum} times.`, true);
    }

};
