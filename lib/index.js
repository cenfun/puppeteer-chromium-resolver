const path = require('path');
const fs = require('fs');
const os = require('os');
const EC = require('eight-colors');
const puppeteer = require('puppeteer-core');
const PingMonitor = require('ping-monitor');
const Gauge = require('gauge');
const gauge = new Gauge();

const createBrowserFetcher = (options) => {
    return new puppeteer.BrowserFetcher(options);
};

//=========================================================================================
let outputSilent = false;
const output = (msg, isError) => {
    gauge.disable();
    if (!outputSilent) {
        if (isError) {
            console.log(EC.red(`[PCR] ${msg}`));
        } else {
            console.log(`[PCR] ${msg}`);
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

    output(`Chromium downloaded to ${option.userFolder}`);

    let localRevisions = await browserFetcher.localRevisions();
    if (localRevisions && localRevisions.length) {
        output('Checking previous local chromium revisions ...');
        localRevisions = localRevisions.filter((revision) => revision !== option.revision);
        if (localRevisions.length > option.cacheRevisions) {
            localRevisions.sort();
            localRevisions.length -= option.cacheRevisions;
            output(`Removing useless revisions ${localRevisions.join(', ')}`);
            const cleanupOldVersions = localRevisions.map((revision) => browserFetcher.remove(revision));
            await Promise.all([... cleanupOldVersions]);
        }
    }

    return true;
};


const downloadFromHost = (option) => {
    output(`Downloading from host: ${option.host} ...`);
    const browserFetcher = createBrowserFetcher({
        host: option.host,
        path: option.userFolder
    });
    //download start now
    return downloadNow(option, browserFetcher);
};

const downloadStart = async (option) => {

    for (const host of option.hosts) {
        option.host = host;
        const res = await downloadFromHost(option);
        if (res) {
            return res;
        }
    }

    if (option.retryTimes <= option.retry) {
        option.retryTimes += 1;
        output('Retry Chromium downloading ... ');
        return downloadStart(option);
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
    hosts = list.map((item) => item.host);
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

    const res = await downloadStart(option);
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
    detectionPath = `${detectionPath}`;
    if (detectionPath) {
        return detectionPath.split(',');
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
        const parent = path.resolve(current, '../');
        if (parent === current) {
            current = '';
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
    const browserFetcher = createBrowserFetcher({
        path: detectionPath
    });
    const revisionInfo = browserFetcher.revisionInfo(option.revision);
    return revisionInfo;
};

const detectionHandler = (option) => {
    for (const detectionPath of option.detectionList) {
        const revisionInfo = detectionPathHandler(option, detectionPath);
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
        output('Detected local chromium is already downloaded');
        return true;
    }
    output('Not found local chromium');
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
        output(`User path is not writable: ${userFolder}`);
        output(e);
    }
    return userFolder;
};

const initRevision = (option) => {
    if (option.revision) {
        return option.revision;
    }
    let revisions;
    try {
        revisions = require('puppeteer-core/lib/cjs/puppeteer/revisions.js');
    } catch (e) {
        // empty
    }
    //console.log(revisions);
    if (revisions) {
        return revisions.PUPPETEER_REVISIONS.chromium;
    }
    return '782078';
};

const initPuppeteerConf = (option) => {
    if (option.puppeteerConf) {
        return option.puppeteerConf;
    }
    let config;
    try {
        config = require('puppeteer-core/package.json');
    } catch (e) {
        // empty
    }
    return config;
};

const getOptionFromPackage = () => {
    let config;
    try {
        config = require(path.resolve('package.json'));
    } catch (e) {
        // empty
    }
    if (!config || !config.pcr) {
        return;
    }
    //console.log(config.pcr);
    return config.pcr;
};

const getOption = (option) => {
    const defaultOption = {
        revision: '',
        detectionPath: '',
        folderName: '.chromium-browser-snapshots',
        defaultHosts: ['https://storage.googleapis.com', 'https://npm.taobao.org/mirrors'],
        hosts: [],
        cacheRevisions: 2,
        retry: 3,
        silent: false
    };

    const optionFromPackage = getOptionFromPackage();

    option = Object.assign(defaultOption, optionFromPackage, option);

    return option;
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
        setTimeout(function() {
            browser.close();
        }, 1000);
    }
};

// \ to /
const formatPath = (str) => {
    if (str) {
        str = str.replace(/\\/g, '/');
    }
    return str;
};

const revisionHandler = (option) => {

    const revisionInfo = option.revisionInfo;
    //Chromium
    revisionInfo.executablePath = formatPath(revisionInfo.executablePath);
    let executablePath = revisionInfo.executablePath;
    if (executablePath) {
        executablePath = fs.existsSync(executablePath) ? EC.green(executablePath) : EC.red(executablePath);
        output(`Chromium executablePath: ${executablePath}`);
    }

    revisionInfo.folderPath = formatPath(revisionInfo.folderPath);
    revisionInfo.userFolder = formatPath(option.userFolder);

    revisionInfo.chromiumVersion = option.chromiumVersion;
    if (revisionInfo.chromiumVersion) {
        output(`Chromium version: ${EC.magenta(revisionInfo.chromiumVersion)}`);
    }

    if (typeof option.launchable === 'boolean') {
        revisionInfo.launchable = option.launchable;
        const launchable = revisionInfo.launchable ? EC.green('true') : EC.red('false');
        output(`Chromium launchable: ${launchable}`);
    }

    //Puppeteer
    if (option.puppeteerConf) {
        revisionInfo.puppeteerVersion = option.puppeteerConf.version;
        output(`Puppeteer version: ${EC.magenta(revisionInfo.puppeteerVersion)}`);
    }
    revisionInfo.puppeteer = puppeteer;

    return revisionInfo;
};

//=========================================================================================

const getStatsPath = () => {
    const homePath = os.homedir();
    const statsPath = path.resolve(homePath, '.pcr-stats.json');
    return statsPath;
};

const saveStats = (revisionInfo) => {
    const statsPath = getStatsPath();
    const stats = {
        ... revisionInfo
    };
    delete stats.puppeteer;
    fs.writeFileSync(statsPath, JSON.stringify(stats, null, 4));
    output(`Stats saved: ${path.relative(process.cwd(), statsPath)}`);
};

const getStats = () => {
    const statsPath = getStatsPath();
    let stats;
    try {
        stats = JSON.parse(fs.readFileSync(statsPath));
    } catch (e) {
        output('Not found PCR stats cache, try npm install again.', true);
    }
    if (stats) {
        stats.puppeteer = puppeteer;
    }
    return stats;
};

const PCR = async (option = {}) => {

    option = getOption(option);

    //from stats cache
    outputSilent = true;
    const stats = getStats();
    if (stats && fs.existsSync(stats.executablePath)) {
        //if has custom revision should be matched
        if (!option.revision || (option.revision && option.revision === stats.revision)) {
            return stats;
        }
    }

    //try to detection and install
    outputSilent = option.silent;

    option.puppeteerConf = initPuppeteerConf(option);
    option.revision = initRevision(option);
    output(`Chromium revision: ${EC.magenta(option.revision)}`);
    option.userFolder = initUserFolder(option);
    //output("User folder: " + option.userFolder);

    const localChromium = detectionLocalChromium(option);
    if (!localChromium) {
        await downloadHandler(option);
        await launchHandler(option);
    }

    const revisionInfo = await revisionHandler(option);
    //console.log(revisionInfo);

    saveStats(revisionInfo);

    //close gauge
    gauge.disable();

    return revisionInfo;
};

PCR.getStats = getStats;
PCR.getStatsPath = getStatsPath;
PCR.createBrowserFetcher = createBrowserFetcher;

module.exports = PCR;
