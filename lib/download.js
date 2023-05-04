const EC = require('eight-colors');
const Util = require('./util.js');

const BrowserPlatform = {
    LINUX: 'linux',
    MAC: 'mac',
    MAC_ARM: 'mac_arm',
    WIN32: 'win32',
    WIN64: 'win64'
};

function folder(platform) {
    switch (platform) {
        case BrowserPlatform.LINUX:
            return 'Linux_x64';
        case BrowserPlatform.MAC_ARM:
            return 'Mac_Arm';
        case BrowserPlatform.MAC:
            return 'Mac';
        case BrowserPlatform.WIN32:
            return 'Win';
        case BrowserPlatform.WIN64:
            return 'Win_x64';
        default:
            return '';
    }
}

function archive(platform, buildId) {
    switch (platform) {
        case BrowserPlatform.LINUX:
            return 'chrome-linux';
        case BrowserPlatform.MAC_ARM:
        case BrowserPlatform.MAC:
            return 'chrome-mac';
        case BrowserPlatform.WIN32:
        case BrowserPlatform.WIN64:
            // Windows archive name changed at r591479.
            return parseInt(buildId, 10) > 591479 ? 'chrome-win' : 'chrome-win32';
        default:
            return '';
    }
}

const resolveDownloadPath = (platform, buildId) => {
    return [folder(platform), buildId, `${archive(platform, buildId)}.zip`];
};

// baseUrl 'https://storage.googleapis.com/chromium-browser-snapshots'
const resolveDownloadUrl = (platform, buildId, baseUrl) => {
    return `${baseUrl}/${resolveDownloadPath(platform, buildId).join('/')}`;
};

const getBaseUrl = (host) => {
    return `${host}/chromium-browser-snapshots`;
};

const downloadFromHost = async (options, host) => {
    Util.output(`Downloading from: ${host} ...`);
    Util.createGauge();

    let failed = false;
    const installedBrowser = await Util.install({
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

    await Util.delay(500);

    Util.closeGauge();

    if (failed || !installedBrowser) {
        return;
    }

    Util.output(`Chromium downloaded: ${installedBrowser.buildId}`);

    return installedBrowser;
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

    const { platform, revision } = options;
    const baseUrl = getBaseUrl(host);

    const downloadUrl = resolveDownloadUrl(platform, revision, baseUrl);
    const ok = await Util.headRequest(downloadUrl);
    const time = Date.now() - time_start;

    const available = ok ? EC.green(ok) : EC.red(ok);
    Util.output(`Head request: ${downloadUrl} - ${available} (${time}ms)`);

    return {
        host,
        time,
        ok,
        downloadUrl
    };
};

const preDownloadStart = async (options) => {
    const list = await Promise.all(options.hosts.map((host) => preDownloadFromHost(options, host)));
    // console.log(list);

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
        options.executablePath = Util.computeExecutablePath({
            platform: installedBrowser.platform,
            buildId: installedBrowser.buildId,
            cacheDir: options.snapshotsDir
        });
    } else {
        Util.output(`ERROR: Failed to download Chromium after retry ${options.retryNum} times.`, true);
    }

};
