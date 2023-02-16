const path = require('path');
const fs = require('fs');
const os = require('os');
const EC = require('eight-colors');
const puppeteer = require('puppeteer-core');
const PingMonitor = require('ping-monitor');
const Gauge = require('gauge');
const gauge = new Gauge();

const defaultOptions = require('./options.js');

const createBrowserFetcher = (options) => {
    return new puppeteer.BrowserFetcher(options);
};

// console.log(puppeteer.PUPPETEER_REVISIONS);
const getPuppeteerChromiumRevision = () => {
    const revisions = puppeteer.PUPPETEER_REVISIONS;
    if (revisions) {
        return revisions.chromium;
    }
    return '1095492';
};

const getPuppeteerVersion = () => {
    let config;
    try {
        config = require('puppeteer-core/package.json');
    } catch (e) {
        // empty
        return;
    }
    if (config) {
        return config.version;
    }
};

// =========================================================================================
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

// =========================================================================================

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

// =========================================================================================

const downloadNow = async (options, browserFetcher) => {

    let downloading = false;
    await browserFetcher.download(options.revision, (downloadedBytes, totalBytes) => {
        downloading = true;
        showProgress(downloadedBytes, totalBytes);
    }).catch((error) => {
        output(error, true);
    });

    if (!downloading) {
        return false;
    }

    output(`Chromium downloaded to ${options.userFolder}`);

    let localRevisions = await browserFetcher.localRevisions();
    if (localRevisions && localRevisions.length) {
        output('Checking previous local chromium revisions ...');
        localRevisions = localRevisions.filter((revision) => revision !== options.revision);
        if (localRevisions.length > options.cacheRevisions) {
            localRevisions.sort();
            localRevisions.length -= options.cacheRevisions;
            output(`Removing useless revisions ${localRevisions.join(', ')}`);
            const cleanupOldVersions = localRevisions.map((revision) => browserFetcher.remove(revision));
            await Promise.all([... cleanupOldVersions]);
        }
    }

    return true;
};


const downloadFromHost = (options) => {
    output(`Downloading from host: ${options.host} ...`);
    const browserFetcher = createBrowserFetcher({
        host: options.host,
        path: options.userFolder
    });
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
        output('Retry Chromium downloading ... ');
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

const sortHosts = async (hosts) => {
    if (hosts.length < 2) {
        return hosts;
    }

    const list = [];
    for (const host of hosts) {
        const info = await pingHost(host);
        output(`ping host: ${info.host} - ${info.time}ms`);
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

const downloadHandler = async (options) => {
    // //Not found, try to download to user folder
    options.revisionInfo = options.userRevisionInfo;
    let hosts = options.hosts;
    if (!hosts || !hosts.length) {
        hosts = options.defaultHosts;
    }

    hosts = await sortHosts(hosts);
    options.hosts = hosts;
    options.retryTimes = 0;

    const res = await downloadStart(options);
    if (!res) {
        output(`ERROR: Failed to download Chromium after retry ${options.retryTimes} times.`, true);
    }
};

// =========================================================================================

const getDetectionPath = (options) => {
    let detectionPath = options.detectionPath;
    if (Array.isArray(detectionPath)) {
        return detectionPath;
    }
    detectionPath = `${detectionPath}`;
    if (detectionPath) {
        return detectionPath.split(',');
    }
    return [];
};

const initDetectionList = (options) => {
    // from user custom
    const detectionList = getDetectionPath(options);
    // from user folder
    detectionList.push(options.userFolder);
    // from current folder and up 5 level folder
    const folderName = options.folderName;
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
    // all detection list
    return detectionList;
};

const detectionPathHandler = (options, detectionPath) => {
    detectionPath = path.resolve(detectionPath);
    const browserFetcher = createBrowserFetcher({
        path: detectionPath
    });
    const revisionInfo = browserFetcher.revisionInfo(options.revision);
    return revisionInfo;
};

const detectionHandler = (options) => {
    for (const detectionPath of options.detectionList) {
        const revisionInfo = detectionPathHandler(options, detectionPath);
        if (detectionPath === options.userFolder) {
            options.userRevisionInfo = revisionInfo;
        }
        if (revisionInfo.local) {
            return revisionInfo;
        }
    }
    return null;
};

const detectionLocalChromium = (options) => {
    options.detectionList = initDetectionList(options);
    // output(detectionList.join("\n"));
    const revisionInfo = detectionHandler(options);
    if (revisionInfo) {
        options.revisionInfo = revisionInfo;
        output('Detected local chromium is already downloaded');
        return true;
    }
    output('Not found local chromium');
    return false;
};

// =========================================================================================

const initUserFolder = (options) => {
    const homePath = os.homedir();
    const userFolder = path.resolve(homePath, options.folderName);
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

const getOptionsFromPackage = () => {
    let config;
    try {
        config = require(path.resolve('package.json'));
    } catch (e) {
        // empty
    }
    if (!config || !config.pcr) {
        return;
    }
    // console.log(config.pcr);
    return config.pcr;
};

const getOptions = (options) => {
    const optionsFromPackage = getOptionsFromPackage();
    options = Object.assign(defaultOptions, optionsFromPackage, options);
    return options;
};

// =========================================================================================

const launchHandler = async (options) => {
    options.launchable = false;
    const browser = await puppeteer.launch({
        // fix root issue
        args: ['--no-sandbox'],
        executablePath: options.revisionInfo.executablePath
    }).catch((error) => {
        // output(error, true);
        console.log(error);
    });
    if (browser) {
        options.launchable = true;
        options.chromiumVersion = await browser.version();
        // delay close, fix unknown log in console
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

const revisionHandler = (options) => {

    const revisionInfo = options.revisionInfo;
    // Chromium
    revisionInfo.executablePath = formatPath(revisionInfo.executablePath);
    let executablePath = revisionInfo.executablePath;
    if (executablePath) {
        executablePath = fs.existsSync(executablePath) ? EC.green(executablePath) : EC.red(executablePath);
        output(`Chromium executablePath: ${executablePath}`);
    }

    revisionInfo.folderPath = formatPath(revisionInfo.folderPath);
    revisionInfo.userFolder = formatPath(options.userFolder);

    revisionInfo.chromiumVersion = options.chromiumVersion;
    if (revisionInfo.chromiumVersion) {
        output(`Chromium version: ${EC.magenta(revisionInfo.chromiumVersion)}`);
    }

    if (typeof options.launchable === 'boolean') {
        revisionInfo.launchable = options.launchable;
        const launchable = revisionInfo.launchable ? EC.green('true') : EC.red('false');
        output(`Chromium launchable: ${launchable}`);
    }

    const version = getPuppeteerVersion();
    if (version) {
        revisionInfo.puppeteerVersion = version;
        output(`Puppeteer version: ${EC.magenta(version)}`);
    }
    revisionInfo.puppeteer = puppeteer;

    return revisionInfo;
};

// =========================================================================================

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

const PCR = async (options = {}) => {

    options = getOptions(options);

    // from stats cache
    outputSilent = true;
    const stats = getStats();
    if (stats && fs.existsSync(stats.executablePath)) {
        // if has custom revision should be matched
        if (!options.revision || (options.revision && options.revision === stats.revision)) {
            return stats;
        }
    }

    // try to detection and install
    outputSilent = options.silent;

    options.revision = options.revision || getPuppeteerChromiumRevision();
    output(`Chromium revision: ${EC.magenta(options.revision)}`);
    options.userFolder = initUserFolder(options);
    // output("User folder: " + options.userFolder);

    const localChromium = detectionLocalChromium(options);
    if (!localChromium) {
        await downloadHandler(options);
        await launchHandler(options);
    }

    const revisionInfo = await revisionHandler(options);
    // console.log(revisionInfo);

    saveStats(revisionInfo);

    // close gauge
    gauge.disable();

    return revisionInfo;
};

PCR.getStats = getStats;
PCR.getStatsPath = getStatsPath;
PCR.createBrowserFetcher = createBrowserFetcher;

module.exports = PCR;
