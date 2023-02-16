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
        await Promise.all([... cleanupOldVersions]);
    }

};

const downloadFromHost = async (options, host) => {
    Util.output(`Downloading from host: ${host} ...`);
    const browserFetcher = Util.createBrowserFetcher({
        host: host,
        path: options.snapshotsDir
    });

    const revisionInfo = await browserFetcher.download(options.revision, (downloadedBytes, totalBytes) => {
        Util.showProgress(downloadedBytes, totalBytes);
    }).catch((error) => {
        Util.output(error, true);
    });

    if (!revisionInfo) {
        return;
    }

    await cleanLocalRevisions(options, browserFetcher);

    return revisionInfo;

};

// =========================================================================================

const downloadStart = async (options, list) => {

    for (const item of list) {
        const res = await downloadFromHost(options, item.host);
        if (res) {
            return res;
        }
    }

    if (options.retryNum <= options.retry) {
        options.retryNum += 1;
        Util.output('Retry Chromium downloading ... ');
        return downloadStart(options);
    }

    return false;
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
        hosts = ['https://storage.googleapis.com', 'https://npm.taobao.org/mirrors'];
    }
    return hosts;
};

// =========================================================================================

module.exports = async (options) => {

    const hosts = getHosts(options);

    const list = await preDownloadStart(options, hosts);

    options.retryNum = 0;
    const ok = await downloadStart(options, list);

    if (!ok) {
        Util.output(`ERROR: Failed to download Chromium after retry ${options.retryNum} times.`, true);
    }

};
