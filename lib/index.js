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

const getHosts = (options) => {
    let hosts = options.hosts;
    if (!Util.isList(hosts)) {
        // default hosts
        hosts = ['https://storage.googleapis.com'];
    }
    return hosts;
};

const getCacheDir = (options) => {
    const downloadPath = options.downloadPath;
    if (!downloadPath) {
        return os.homedir();
    }
    const cacheDir = path.resolve(downloadPath);
    if (fs.existsSync(cacheDir)) {
        return cacheDir;
    }
    try {
        fs.mkdirSync(cacheDir, {
            recursive: true
        });
    } catch (e) {
        // console.error(e);
        Util.output(`Failed to create download dir: ${Util.formatPath(cacheDir)}`, true);
    }
    return cacheDir;
};

const getSnapshotsDir = (options) => {
    const folderName = options.folderName || '.chromium-browser-snapshots';
    const snapshotsDir = path.resolve(options.cacheDir, folderName);
    if (fs.existsSync(snapshotsDir)) {
        return snapshotsDir;
    }
    try {
        fs.mkdirSync(snapshotsDir, {
            recursive: true
        });
    } catch (e) {
        // console.error(e);
        Util.output(`Failed to create download dir: ${Util.formatPath(snapshotsDir)}`, true);
    }
    return snapshotsDir;
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

const getOptions = (options = {}) => {
    const optionsFromPackage = getOptionsFromPackage();
    options = Object.assign(defaultOptions, optionsFromPackage, options);

    options.hosts = getHosts(options);

    // init cache dir, for snapshots and stats file
    options.cacheDir = getCacheDir(options);
    // for snapshots
    options.snapshotsDir = getSnapshotsDir(options);

    return options;
};

// =========================================================================================

const launchHandler = async (options) => {
    options.launchable = false;
    if (!options.executablePath) {
        return;
    }
    const browser = await puppeteer.launch({
        headless: 'new',
        // fix root issue
        args: ['--no-sandbox'],
        executablePath: options.executablePath
    }).catch((error) => {
        // output(error, true);
        console.log(error);
    });
    if (browser) {
        options.launchable = true;
        options.chromiumVersion = await browser.version();
        // delay close, fix unknown log in console
        await browser.close();
        await Util.delay(500);
    }
};

// =========================================================================================
const getPuppeteerVersion = () => {
    const version = Util.getPuppeteerVersion();
    if (!version) {
        Util.output('Failed to get puppeteer version', true);
        return;
    }
    Util.output(`Puppeteer version: ${EC.magenta(version)}`);
    return version;
};

const getBrowserPlatform = () => {
    const platform = Util.detectBrowserPlatform();
    Util.output(`Browser platform: ${EC.magenta(platform)}`);
    return platform;
};

const getChromiumRevision = async (options) => {
    let revision = options.revision;
    if (!revision) {
        revision = await Util.resolveBuildId(options.platform);
    }
    Util.output(`Chromium revision: ${EC.magenta(revision)}`);
    return revision;
};

const statsInfoHandler = (options) => {

    const statsInfo = {
        puppeteerVersion: options.puppeteerVersion,
        platform: options.platform,
        revision: options.revision
    };

    // cache snapshots and stats file
    statsInfo.cacheDir = Util.formatPath(options.cacheDir);

    // cache snapshots
    statsInfo.snapshotsDir = Util.formatPath(options.snapshotsDir);

    // Chromium executablePath
    let executablePath = options.executablePath;
    if (executablePath) {
        executablePath = Util.formatPath(executablePath);
        statsInfo.executablePath = executablePath;
        executablePath = fs.existsSync(executablePath) ? EC.green(executablePath) : EC.red(executablePath);
        Util.output(`Chromium executablePath: ${executablePath}`);
    }

    const chromiumVersion = options.chromiumVersion;
    if (chromiumVersion) {
        statsInfo.chromiumVersion = chromiumVersion;
        Util.output(`Chromium version: ${EC.magenta(chromiumVersion)}`);
    }

    if (typeof options.launchable === 'boolean') {
        statsInfo.launchable = options.launchable;
        const launchable = statsInfo.launchable ? EC.green('true') : EC.red('false');
        Util.output(`Chromium launchable: ${launchable}`);
    }

    // save new stats
    saveStats(options, statsInfo);

    // re-exports
    statsInfo.puppeteer = puppeteer;

    return statsInfo;
};

// =========================================================================================

const getStatsPath = (options = {}) => {
    const statsDir = options.cacheDir || os.homedir();
    const statsName = options.statsName || '.pcr-stats.json';
    const statsPath = path.resolve(statsDir, statsName);
    return statsPath;
};

const saveStats = (options, statsInfo) => {
    const statsPath = getStatsPath(options);
    const stats = {
        ... statsInfo
    };
    try {
        fs.writeFileSync(statsPath, JSON.stringify(stats, null, 4));
    } catch (e) {
        Util.output(`Failed to save stats: ${Util.formatPath(statsPath)}`, true);
        return;
    }
    Util.output(`Stats saved: ${Util.formatPath(statsPath)}`);
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

const PCR = async (options) => {

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

    // try to detect and install

    Util.silent = options.silent;

    options.puppeteerVersion = getPuppeteerVersion();

    options.platform = getBrowserPlatform();

    // chromium revision to use
    options.revision = await getChromiumRevision(options);

    const localChromium = detectHandler(options);
    if (!localChromium) {
        await downloadHandler(options);
        await launchHandler(options);
    }

    // force to close gauge
    Util.closeGauge();

    const statsInfo = await statsInfoHandler(options);
    // console.log(statsInfo);

    return statsInfo;
};

// =========================================================================================

// additional API
PCR.getOptions = getOptions;
PCR.getStats = (options) => {
    return getStats(getOptions(options));
};

module.exports = PCR;
