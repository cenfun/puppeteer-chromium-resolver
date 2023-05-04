const EC = require('eight-colors');
const Util = require('./util.js');

const getBaseUrl = (host) => {
    return `${host}/chromium-browser-snapshots`;
};

const downloadFromHost = async (options, host) => {
    Util.output(`Downloading from: ${host} ...`);
    Util.createGauge();

    let failed = false;
    const InstalledBrowser = await Util.install({
        baseUrl: getBaseUrl(host),
        buildId: options.revision,
        cacheDir: options.snapshotsDir,
        downloadProgressCallback: (downloadedBytes, totalBytes) => {
            Util.showProgress(downloadedBytes, totalBytes);
        }
    }).catch((error) => {
        failed = true;
        Util.output(error, true);
    });

    Util.closeGauge();

    if (failed || !InstalledBrowser) {
        return;
    }

    Util.output(`Chromium downloaded: ${InstalledBrowser.buildId}`);

    return InstalledBrowser;
};

// =========================================================================================

const downloadStart = async (options, list) => {

    for (const item of list) {
        const installedBrowser = await downloadFromHost(options, item.host);
        if (installedBrowser) {
            return installedBrowser;
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
    const time_start = Date.now();
    const ok = await Util.canDownload({
        baseUrl: getBaseUrl(host),
        buildId: options.revision,
        cacheDir: options.snapshotsDir
    });
    const time = Date.now() - time_start;

    const available = ok ? EC.green(ok) : EC.red(ok);
    Util.output(`Can download: ${host} - ${available} (${time}ms)`);

    return {
        host,
        time,
        ok
    };
};

const preDownloadStart = async (options) => {
    const list = [];
    for (const host of options.hosts) {
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

module.exports = async (options) => {

    const list = await preDownloadStart(options);

    options.retryNum = 0;
    const installedBrowser = await downloadStart(options, list);
    if (installedBrowser) {
        options.installedBrowser = installedBrowser;
    } else {
        Util.output(`ERROR: Failed to download Chromium after retry ${options.retryNum} times.`, true);
    }

};
