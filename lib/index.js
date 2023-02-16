const path = require('path');
const fs = require('fs');
const os = require('os');
const EC = require('eight-colors');
const puppeteer = require('puppeteer-core');

const Util = require('./util.js');
const defaultOptions = require('./options.js');
const detectHandler = require('./detect.js');
const downloadHandler = require('./download.js');

// =========================================================================================

const initUserFolder = (options) => {
    const folderName = options.folderName || '.chromium-browser-snapshots';
    const homePath = os.homedir();
    const userFolder = path.resolve(homePath, folderName);
    if (fs.existsSync(userFolder)) {
        return userFolder;
    }
    try {
        fs.mkdirSync(userFolder, '0777');
        // Make double sure we have 0777 permissions; some operating systems
        // default umask does not allow write by default.
        fs.chmodSync(userFolder, '0777');
    } catch (e) {
        // console.error(e);
        Util.output(`User path is not writable: ${userFolder}`);
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

const revisionHandler = (options) => {

    const revisionInfo = options.revisionInfo;
    // Chromium
    revisionInfo.executablePath = Util.formatPath(revisionInfo.executablePath);
    let executablePath = revisionInfo.executablePath;
    if (executablePath) {
        executablePath = fs.existsSync(executablePath) ? EC.green(executablePath) : EC.red(executablePath);
        Util.output(`Chromium executablePath: ${executablePath}`);
    }

    revisionInfo.folderPath = Util.formatPath(revisionInfo.folderPath);
    revisionInfo.userFolder = Util.formatPath(options.userFolder);

    revisionInfo.chromiumVersion = options.chromiumVersion;
    if (revisionInfo.chromiumVersion) {
        Util.output(`Chromium version: ${EC.magenta(revisionInfo.chromiumVersion)}`);
    }

    if (typeof options.launchable === 'boolean') {
        revisionInfo.launchable = options.launchable;
        const launchable = revisionInfo.launchable ? EC.green('true') : EC.red('false');
        Util.output(`Chromium launchable: ${launchable}`);
    }

    const version = Util.getPuppeteerVersion();
    if (version) {
        revisionInfo.puppeteerVersion = version;
        Util.output(`Puppeteer version: ${EC.magenta(version)}`);
    }
    revisionInfo.puppeteer = puppeteer;

    return revisionInfo;
};

// =========================================================================================

const getStatsPath = (options = {}) => {
    const statsName = options.statsName || '.pcr-stats.json';
    const homePath = os.homedir();
    const statsPath = path.resolve(homePath, statsName);
    return statsPath;
};

const saveStats = (options, revisionInfo) => {
    const statsPath = getStatsPath(options);
    const stats = {
        ... revisionInfo
    };
    delete stats.puppeteer;
    fs.writeFileSync(statsPath, JSON.stringify(stats, null, 4));
    Util.output(`Stats saved: ${path.relative(process.cwd(), statsPath)}`);
};

const getStats = (options) => {
    const statsPath = getStatsPath(options);
    let stats;
    try {
        stats = JSON.parse(fs.readFileSync(statsPath));
    } catch (e) {
        // console.error(e);
        Util.output('Not found PCR stats cache, try npm install again.', true);
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
    Util.silent = true;
    const stats = getStats(options);
    if (stats && fs.existsSync(stats.executablePath)) {
        // if has custom revision should be matched
        if (!options.revision || (options.revision && options.revision === stats.revision)) {
            return stats;
        }
    }

    // try to detection and install
    Util.silent = options.silent;

    options.revision = options.revision || Util.getPuppeteerChromiumRevision();
    Util.output(`Chromium revision: ${EC.magenta(options.revision)}`);

    // TODO
    options.userFolder = initUserFolder(options);
    // output("User folder: " + options.userFolder);

    const localChromium = detectHandler(options);
    if (!localChromium) {
        await downloadHandler(options);
        await launchHandler(options);
    }

    const revisionInfo = await revisionHandler(options);
    // console.log(revisionInfo);

    saveStats(options, revisionInfo);

    // close gauge
    Util.gaugeDisable();

    return revisionInfo;
};

PCR.getStats = getStats;
PCR.getStatsPath = getStatsPath;
PCR.createBrowserFetcher = Util.createBrowserFetcher;

module.exports = PCR;
