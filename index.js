const path = require('path');
const fs = require('fs');
const os = require('os');
const util = require('util');
const URL = require('url');
const puppeteer = require('puppeteer-core');

const Gauge = require('gauge');
const gauge = new Gauge();

//=========================================================================================
//https://en.wikipedia.org/wiki/ANSI_escape_code
//color
//0 - 7
const Color = {
    bg: {}
};
const addColor = (start, str, end) => {
    return `\x1b[${start}m${str}\x1b[${end}m`;
};
const list = ['black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white'];
list.forEach((name, i) => {
    Color[name] = (str) => {
        return addColor("3" + i, str, "39");
    };
    Color.bg[name] = (str) => {
        return addColor("4" + i, str, "49");
    };
});

const output = (msg, isError) => {
    gauge.disable();
    if (isError) {
        console.log(Color.red("[PCR] " + msg));
    } else {
        console.log("[PCR] " + msg);
    }
    gauge.enable();
};

//=========================================================================================

const tryRequest = (url, method, timeout) => {
    return new Promise((resolve) => {
        output("Try requesting " + url);
        var options = URL.parse(url);
        options.method = method;
        options.timeout = timeout;
        var req;
        if (options.protocol === 'https:') {
            req = require('https').request(options);
        } else {
            req = require('http').request(options);
        }
        var timeoutId = setTimeout(() => {
            req.abort();
            resolve();
        }, timeout + 1000);
        req.setTimeout(timeout);
        req.on('response', async (res) => {
            clearTimeout(timeoutId);
            req.abort();
            //output(res.statusCode);
            if (res.statusCode === 200) {
                resolve(true);
                return;
            }
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                var value = await tryRequest(res.headers.location, method, timeout);
                resolve(value);
                return;
            }
            resolve();
        });
        req.on('error', () => {
            clearTimeout(timeoutId);
            req.abort();
            resolve();
        });
        req.on('timeout', () => {
            clearTimeout(timeoutId);
            req.abort();
            resolve();
        });
        req.end();
    });
};

//=========================================================================================

const toMegabytes = (bytes) => {
    const mb = bytes / 1024 / 1024;
    return `${Math.round(mb * 10) / 10} Mb`;
};

const showProgress = (downloadedBytes, totalBytes) => {
    var per = 0;
    if (totalBytes) {
        per = downloadedBytes / totalBytes;
    }
    gauge.show(`Downloading Chromium - ${toMegabytes(downloadedBytes)} / ${toMegabytes(totalBytes)}`, per);
};

//=========================================================================================

const archiveName = (platform, revision) => {
    if (platform === 'linux') {
        return 'chrome-linux';
    }
    if (platform === 'mac') {
        return 'chrome-mac';
    }
    if (platform === 'win32' || platform === 'win64') {
        // Windows archive name changed at r591479.
        return parseInt(revision, 10) > 591479 ? 'chrome-win' : 'chrome-win32';
    }
    return null;
};

const getDownloadUrl = (browserFetcher, host, revision) => {
    const downloadURLs = {
        linux: '%s/chromium-browser-snapshots/Linux_x64/%d/%s.zip',
        mac: '%s/chromium-browser-snapshots/Mac/%d/%s.zip',
        win32: '%s/chromium-browser-snapshots/Win/%d/%s.zip',
        win64: '%s/chromium-browser-snapshots/Win_x64/%d/%s.zip',
    };
    var platform = browserFetcher.platform();
    return util.format(downloadURLs[platform], host, revision, archiveName(platform, revision));
};


//=========================================================================================

const downloadNow = async (option, browserFetcher) => {

    var downloading = false;
    await browserFetcher.download(option.revision, (downloadedBytes, totalBytes) => {
        downloading = true;
        showProgress(downloadedBytes, totalBytes);
    }).catch((error) => {
        output(error, true);
    });

    if (!downloading) {
        return false;
    }

    output('Chromium downloaded to ' + option.userFolder);

    var localRevisions = await browserFetcher.localRevisions();
    if (localRevisions && localRevisions.length) {
        output('Removing previous local chromium revisions ...');
        localRevisions = localRevisions.filter(revision => revision !== option.revision);
        const cleanupOldVersions = localRevisions.map(revision => browserFetcher.remove(revision));
        await Promise.all([...cleanupOldVersions]);
    }

    return true;
};


const downloadFromHost = async (option) => {
    output("Downloading from host: " + option.host + " ...");
    const browserFetcher = puppeteer.createBrowserFetcher({
        host: option.host,
        path: option.userFolder
    });
    //try url if is valid in 5000ms
    var downloadUrl = getDownloadUrl(browserFetcher, option.host, option.revision);
    var res = await tryRequest(downloadUrl, 'GET', 5000).catch((e) => {
        output(e);
    });
    if (!res) {
        return false;
    }
    //download start now
    return await downloadNow(option, browserFetcher);
};

const downloadStart = async (option) => {

    for (let host of option.hosts) {
        option.host = host;
        let res = await downloadFromHost(option);
        if (res) {
            return res;
        }
    }

    if (option.retryTimes <= option.retry) {
        option.retryTimes += 1;
        output('Retry Chromium downloading ... ');
        return await downloadStart(option);
    }

    return false;
};

const downloadHandler = async (option) => {
    // //Not found, try to download to user folder
    option.revisionInfo = option.userRevisionInfo;
    var hosts = option.hosts;
    if (!hosts || !hosts.length) {
        hosts = option.defaultHosts;
    }
    option.hosts = hosts;
    option.retryTimes = 0;
    let res = await downloadStart(option);
    if (!res) {
        output(`ERROR: Failed to download Chromium after retry ${option.retryTimes} times.`, true);
    }
};

//=========================================================================================

const getDetectionPath = (option) => {
    var detectionPath = option.detectionPath;
    if (Array.isArray(detectionPath)) {
        return detectionPath;
    }
    detectionPath = detectionPath + "";
    if (detectionPath) {
        return detectionPath.split(",");
    }
    return [];
};

const initDetectionList = (option) => {
    //from user custom
    var detectionList = getDetectionPath(option);
    //from user folder
    detectionList.push(option.userFolder);
    //from current folder and up 5 level folder
    var folderName = option.folderName;
    var level = 0;
    var maxLevel = 5;
    var current = process.cwd();
    while (current && level < maxLevel) {
        detectionList.push(path.resolve(current, folderName));
        var parent = path.resolve(current, "../");
        if (parent === current) {
            current = "";
        } else {
            current = parent;
        }
        level += 1;
    }
    //all detection list
    return detectionList;
};

const detectionPathHandler = (option, detectionPath) => {
    detectionPath = path.resolve(detectionPath);
    let browserFetcher = puppeteer.createBrowserFetcher({
        path: detectionPath
    });
    let revisionInfo = browserFetcher.revisionInfo(option.revision);
    return revisionInfo;
};

const detectionHandler = (option) => {
    for (let detectionPath of option.detectionList) {
        let revisionInfo = detectionPathHandler(option, detectionPath);
        if (detectionPath === option.userFolder) {
            option.userRevisionInfo = revisionInfo;
        }
        if (revisionInfo.local) {
            return revisionInfo;
        }
    }
    return null;
};

const detectionLocalChromium = (option) => {
    option.detectionList = initDetectionList(option);
    //output(detectionList.join("\n"));
    var revisionInfo = detectionHandler(option);
    if (revisionInfo) {
        option.revisionInfo = revisionInfo;
        output("Detected local chromium is already downloaded");
        return true;
    }
    output("Not found local chromium");
    return false;
};

//=========================================================================================

const initUserFolder = (option) => {
    var homePath = os.homedir();
    var userFolder = path.resolve(homePath, option.folderName);
    if (fs.existsSync(userFolder)) {
        return userFolder;
    }
    try {
        fs.mkdirSync(userFolder, '0777');
        // Make double sure we have 0777 permissions; some operating systems
        // default umask does not allow write by default.
        fs.chmodSync(userFolder, '0777');
    } catch (e) {
        output("User path is not writable: " + userFolder);
        output(e);
    }
    return userFolder;
};

const initRevision = (option) => {
    if (option.revision) {
        return option.revision;
    }
    if (option.puppeteerConf) {
        return option.puppeteerConf.puppeteer.chromium_revision;
    }
    return require("./package.json").puppeteer.chromium_revision;
};

const initPuppeteerConf = (option) => {
    if (option.puppeteerConf) {
        return option.puppeteerConf;
    }
    var p1 = path.resolve(__dirname, "../puppeteer-core/package.json");
    if (fs.existsSync(p1)) {
        return require(p1);
    }
    var p2 = path.resolve(__dirname, "./node_modules/puppeteer-core/package.json");
    if (fs.existsSync(p2)) {
        return require(p2);
    }
    return null;
};

//=========================================================================================

const launchHandler = async (option) => {
    option.launchable = false;
    var browser = await puppeteer.launch({
        //fix root issue
        args: ['--no-sandbox'],
        executablePath: option.revisionInfo.executablePath
    }).catch((error) => {
        output(error, true);
    });
    if (browser) {
        option.launchable = true;
        option.chromiumVersion = await browser.version();
        browser.close();
    }
};


const revisionHandler = (option) => {

    let revisionInfo = option.revisionInfo;

    //Chromium
    revisionInfo.launchable = option.launchable;
    revisionInfo.chromiumVersion = option.chromiumVersion;
    var launchable = Color.red("false");
    if (revisionInfo.launchable) {
        launchable = Color.green("true");
        output("Chromium executablePath: " + revisionInfo.executablePath);
        if (revisionInfo.chromiumVersion) {
            output("Chromium version: " + revisionInfo.chromiumVersion);
        }
    }
    output("Chromium launchable: " + launchable);

    //Puppeteer
    revisionInfo.puppeteer = puppeteer;
    if (option.puppeteerConf) {
        revisionInfo.puppeteerVersion = option.puppeteerConf.version;
    }
    output("Puppeteer version: " + revisionInfo.puppeteerVersion);

    return revisionInfo;
};

//=========================================================================================

const resolver = async (option = {}) => {

    let defaultOption = {
        revision: "",
        detectionPath: "",
        folderName: '.chromium-browser-snapshots',
        defaultHosts: ["https://storage.googleapis.com", "https://npm.taobao.org/mirrors"],
        hosts: [],
        retry: 3
    };
    option = Object.assign(defaultOption, option);
    option.puppeteerConf = initPuppeteerConf(option);
    option.revision = initRevision(option);
    output("Chromium revision: " + option.revision);
    option.userFolder = initUserFolder(option);

    let localChromium = detectionLocalChromium(option);
    if (!localChromium) {
        await downloadHandler(option);
    }

    await launchHandler(option);

    let revisionInfo = await revisionHandler(option);
    //console.log(revisionInfo);

    //close gauge
    gauge.disable();

    return revisionInfo;
};

module.exports = resolver;