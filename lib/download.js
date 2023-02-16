const EC = require('eight-colors');
const Util = require('./util.js');

const cleanLocalRevisions = async (options, browserFetcher) => {
    let localRevisions = await browserFetcher.localRevisions();
    if (!Util.isList(localRevisions)) {
        return;
    }

    Util.output('Checking previous local chromium revisions ...');
    localRevisions = localRevisions.filter((revision) => revision !== options.revision);
    if (localRevisions.length > options.cacheRevisions) {
        localRevisions.sort();
        localRevisions.length -= options.cacheRevisions;
        Util.output(`Removing useless revisions ${localRevisions.join(', ')}`);
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

    let failed = false;
    const revisionInfo = await browserFetcher.download(options.revision, (downloadedBytes, totalBytes) => {
        Util.showProgress(downloadedBytes, totalBytes);
    }).catch((error) => {
        failed = true;
        Util.output(error, true);
    });

    if (failed || !revisionInfo) {
        return;
    }

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

    const time_start = Date.now();
    const ok = await browserFetcher.canDownload(options.revision);
    const time = Date.now() - time_start;

    const available = ok ? EC.green(ok) : EC.red(ok);
    Util.output(`Check HEAD request: ${host} - ${available} (${time}ms)`);

    const info = browserFetcher.revisionInfo(options.revision);
    console.log(info.url);

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
