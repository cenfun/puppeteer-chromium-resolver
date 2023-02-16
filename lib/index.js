const path = require('path');
const fs = require('fs');
const os = require('os');
const EC = require('eight-colors');
const puppeteer = require('puppeteer-core');

const Gauge = require('gauge');
const gauge = new Gauge();

const defaultOptions = require('./options.js');
const detectHandler = require('./detect.js');
const downloadHandler = require('./download.js');

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

// =========================================================================================

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

// =========================================================================================

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

// =========================================================================================

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

    // TODO
    options.userFolder = initUserFolder(options);
    // output("User folder: " + options.userFolder);

    // utils
    options.output = output;
    options.showProgress = showProgress;
    options.createBrowserFetcher = createBrowserFetcher;

    const localChromium = detectHandler(options);
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
