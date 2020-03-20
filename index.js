const path = require('path');
const fs = require('fs');
const os = require('os');
const puppeteer = require('puppeteer-core');
const PingMonitor = require('ping-monitor');
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

//=========================================================================================
let outputSilent = false;
const output = (msg, isError) => {
    gauge.disable();
    if (!outputSilent) {
        if (isError) {
            console.log(Color.red("[PCR] " + msg));
        } else {
            console.log("[PCR] " + msg);
        }
    }
    gauge.enable();
};

//=========================================================================================

const toMegabytes = (bytes) => {
    const mb = bytes / 1024 / 1024;
    return `${Math.round(mb * 10) / 10} Mb`;
};

const showProgress = (downloadedBytes, totalBytes) => {
    let per = 0;
    if (totalBytes) {
        per = downloadedBytes / totalBytes;
    }
    gauge.show(`Downloading Chromium - ${toMegabytes(downloadedBytes)} / ${toMegabytes(totalBytes)}`, per);
};

//=========================================================================================

const downloadNow = async (option, browserFetcher) => {

    let downloading = false;
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

    let localRevisions = await browserFetcher.localRevisions();
    if (localRevisions && localRevisions.length) {
        output('Checking previous local chromium revisions ...');
        localRevisions = localRevisions.filter(revision => revision !== option.revision);
        if (localRevisions.length > option.cacheRevisions) {
            localRevisions.sort();
            localRevisions.length -= option.cacheRevisions;
            output("Removing useless revisions " + localRevisions.join(", "));
            const cleanupOldVersions = localRevisions.map(revision => browserFetcher.remove(revision));
            await Promise.all([...cleanupOldVersions]);
        }
    }

    return true;
};


const downloadFromHost = async (option) => {
    output("Downloading from host: " + option.host + " ...");
    const browserFetcher = puppeteer.createBrowserFetcher({
        host: option.host,
        path: option.userFolder
    });
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

const pingHost = function (host, timeout = 5000) {
    return new Promise((resolve) => {
        const myMonitor = new PingMonitor({
            website: host
        });
        let time_start = Date.now();
        let timeout_id = setTimeout(() => {
            myMonitor.stop();
            resolve({
                host: host,
                time: timeout,
                isUp: 0
            });
        }, timeout);
        myMonitor.on('up', function (res, state) {
            clearTimeout(timeout_id);
            myMonitor.stop();
            resolve({
                host: host,
                time: res.time,
                isUp: 1
            });
        });
        myMonitor.on('down', function (res) {
            clearTimeout(timeout_id);
            myMonitor.stop();
            resolve({
                host: host,
                time: res.time,
                isUp: 0
            });
        });
        myMonitor.on('error', function (error) {
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

const sortHosts = async (hosts) => {
    if (hosts.length < 2) {
        return hosts;
    }

    const list = [];
    for (const host of hosts) {
        const info = await pingHost(host);
        list.push(info);
    }
    //console.log(list);
    list.sort((a, b) => {
        if (a.isUp === b.isUp) {
            return a.time - b.time;
        }
        return b.isUp - a.isUp;
    });
    //console.log(list);
    hosts = list.map(item => item.host);
    return hosts;
};

const downloadHandler = async (option) => {
    // //Not found, try to download to user folder
    option.revisionInfo = option.userRevisionInfo;
    let hosts = option.hosts;
    if (!hosts || !hosts.length) {
        hosts = option.defaultHosts;
    }

    hosts = await sortHosts(hosts);
    option.hosts = hosts;
    option.retryTimes = 0;

    let res = await downloadStart(option);
    if (!res) {
        output(`ERROR: Failed to download Chromium after retry ${option.retryTimes} times.`, true);
    }
};

//=========================================================================================

const getDetectionPath = (option) => {
    let detectionPath = option.detectionPath;
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
    const detectionList = getDetectionPath(option);
    //from user folder
    detectionList.push(option.userFolder);
    //from current folder and up 5 level folder
    const folderName = option.folderName;
    const maxLevel = 5;
    let level = 0;
    let current = process.cwd();
    while (current && level < maxLevel) {
        detectionList.push(path.resolve(current, folderName));
        let parent = path.resolve(current, "../");
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
    const revisionInfo = detectionHandler(option);
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
    const homePath = os.homedir();
    const userFolder = path.resolve(homePath, option.folderName);
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
    const p1 = path.resolve(__dirname, "../puppeteer-core/package.json");
    if (fs.existsSync(p1)) {
        return require(p1);
    }
    const p2 = path.resolve(__dirname, "./node_modules/puppeteer-core/package.json");
    if (fs.existsSync(p2)) {
        return require(p2);
    }
    return null;
};

//=========================================================================================

const launchHandler = async (option) => {
    option.launchable = false;
    const browser = await puppeteer.launch({
        //fix root issue
        args: ['--no-sandbox'],
        executablePath: option.revisionInfo.executablePath
    }).catch((error) => {
        //output(error, true);
        console.log(error);
    });
    if (browser) {
        option.launchable = true;
        option.chromiumVersion = await browser.version();
        //delay close, fix unknown log in console
        setTimeout(function () {
            browser.close();
        }, 1000);
    }
};


const revisionHandler = (option) => {

    let revisionInfo = option.revisionInfo;

    //Chromium
    revisionInfo.launchable = option.launchable;
    revisionInfo.chromiumVersion = option.chromiumVersion;
    let launchable = Color.red("false");
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
        cacheRevisions: 2,
        retry: 3,
        silent: false
    };
    option = Object.assign(defaultOption, option);

    outputSilent = option.silent;

    option.puppeteerConf = initPuppeteerConf(option);
    option.revision = initRevision(option);
    output("Chromium revision: " + option.revision);
    option.userFolder = initUserFolder(option);
    //output("User folder: " + option.userFolder);

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