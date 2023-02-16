const PingMonitor = require('ping-monitor');
const Util = require('./util.js');

const downloadNow = async (options, browserFetcher) => {

    let downloading = false;
    await browserFetcher.download(options.revision, (downloadedBytes, totalBytes) => {
        downloading = true;
        Util.showProgress(downloadedBytes, totalBytes);
    }).catch((error) => {
        Util.output(error, true);
    });

    if (!downloading) {
        return false;
    }

    Util.output(`Chromium snapshots dir: ${options.snapshotsDir}`);

    let localRevisions = await browserFetcher.localRevisions();
    if (localRevisions && localRevisions.length) {
        Util.output('Checking previous local chromium revisions ...');
        localRevisions = localRevisions.filter((revision) => revision !== options.revision);
        if (localRevisions.length > options.cacheRevisions) {
            localRevisions.sort();
            localRevisions.length -= options.cacheRevisions;
            Util.output(`Removing useless revisions ${localRevisions.join(', ')}`);
            const cleanupOldVersions = localRevisions.map((revision) => browserFetcher.remove(revision));
            await Promise.all([... cleanupOldVersions]);
        }
    }

    return true;
};


const downloadFromHost = (options) => {
    Util.output(`Downloading from host: ${options.host} ...`);
    const browserFetcher = Util.createBrowserFetcher({
        host: options.host,
        path: options.snapshotsDir
    });

    // console.log(browserFetcher);

    // download start now
    return downloadNow(options, browserFetcher);
};

const downloadStart = async (options) => {

    for (const host of options.hosts) {
        options.host = host;
        const res = await downloadFromHost(options);
        if (res) {
            return res;
        }
    }

    if (options.retryTimes <= options.retry) {
        options.retryTimes += 1;
        Util.output('Retry Chromium downloading ... ');
        return downloadStart(options);
    }

    return false;
};

const pingHost = function(host, timeout = 5000) {
    return new Promise((resolve) => {
        const myMonitor = new PingMonitor({
            website: host
        });
        const time_start = Date.now();
        const timeout_id = setTimeout(() => {
            myMonitor.stop();
            resolve({
                host: host,
                time: timeout,
                isUp: 0
            });
        }, timeout);
        myMonitor.on('up', function(res, state) {
            clearTimeout(timeout_id);
            myMonitor.stop();
            resolve({
                host: host,
                time: res.time,
                isUp: 1
            });
        });
        myMonitor.on('down', function(res) {
            clearTimeout(timeout_id);
            myMonitor.stop();
            resolve({
                host: host,
                time: res.time,
                isUp: 0
            });
        });
        myMonitor.on('error', function(error) {
            clearTimeout(timeout_id);
            myMonitor.stop();
            resolve({
                host: host,
                time: Date.now() - time_start,
                isUp: 0
            });
        });
    });
};

const sortHosts = async (options, hosts) => {
    if (hosts.length < 2) {
        return hosts;
    }

    const list = [];
    for (const host of hosts) {
        const info = await pingHost(host);
        Util.output(`ping host: ${info.host} - ${info.time}ms`);
        list.push(info);
    }
    // console.log(list);
    list.sort((a, b) => {
        if (a.isUp === b.isUp) {
            return a.time - b.time;
        }
        return b.isUp - a.isUp;
    });
    // console.log(list);
    hosts = list.map((item) => item.host);
    return hosts;
};


// =========================================================================================


module.exports = async (options) => {
    // //Not found, try to download to user folder
    options.revisionInfo = options.userRevisionInfo;
    let hosts = options.hosts;
    if (!Util.isList(hosts)) {
        // default hosts
        hosts = ['https://storage.googleapis.com', 'https://npm.taobao.org/mirrors'];
    }

    hosts = await sortHosts(options, hosts);
    options.hosts = hosts;
    options.retryTimes = 0;

    const res = await downloadStart(options);
    if (!res) {
        Util.output(`ERROR: Failed to download Chromium after retry ${options.retryTimes} times.`, true);
    }
};
