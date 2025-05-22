"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStatsFromFile = exports.getResolvedOptions = void 0;
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const EC = __importStar(require("eight-colors"));
const puppeteer_core_1 = __importDefault(require("puppeteer-core")); // Import PuppeteerNode and LaunchOptions for type
const util_1 = __importDefault(require("./util"));
const options_1 = __importDefault(require("./options"));
const detect_1 = __importDefault(require("./detect")); // Default export from detect.ts
const download_1 = __importDefault(require("./download")); // Default export from download.ts
const getHostsList = (options) => {
    let hosts = options.hosts;
    if (!util_1.default.isList(hosts) || hosts.length === 0) {
        const defaultHost = process.env.PUPPETEER_DEFAULT_HOST || 'https://storage.googleapis.com';
        hosts = [defaultHost];
    }
    return hosts;
};
const resolveCacheDir = (options) => {
    const downloadPath = options.downloadPath;
    if (!downloadPath) {
        return os.homedir(); // Default to home directory if no downloadPath
    }
    const cacheDir = path.resolve(downloadPath);
    if (!fs.existsSync(cacheDir)) {
        try {
            fs.mkdirSync(cacheDir, { recursive: true });
        }
        catch (e) {
            util_1.default.output(`Failed to create download dir: ${util_1.default.formatPath(cacheDir)} - ${e.message}`, true);
        }
    }
    return cacheDir;
};
const resolveSnapshotsDir = (options) => {
    const folderName = options.folderName || '.chromium-browser-snapshots'; // Fallback just in case
    const snapshotsDir = path.resolve(options.cacheDir, folderName);
    if (!fs.existsSync(snapshotsDir)) {
        try {
            fs.mkdirSync(snapshotsDir, { recursive: true });
        }
        catch (e) {
            util_1.default.output(`Failed to create snapshots dir: ${util_1.default.formatPath(snapshotsDir)} - ${e.message}`, true);
        }
    }
    return snapshotsDir;
};
const getOptionsFromPackage = () => {
    let pkgConfig;
    try {
        // Dynamically require package.json at runtime
        pkgConfig = require(path.resolve(process.cwd(), 'package.json'));
    }
    catch (e) {
        // No package.json or error reading it
        return undefined;
    }
    if (pkgConfig && pkgConfig.pcr && typeof pkgConfig.pcr === 'object') {
        return pkgConfig.pcr;
    }
    return undefined;
};
const getResolvedOptions = (initialOptions = {}) => {
    const optionsFromPackage = getOptionsFromPackage();
    // Start with defaultPcrOptions, merge package options, then merge initialOptions
    const mergedOptions = {
        ...options_1.default,
        ...optionsFromPackage,
        ...initialOptions,
        // These will be definitely set below, so assert types here or fill them
        platform: initialOptions.platform || util_1.default.detectBrowserPlatform(), // platform will be set
        revision: initialOptions.revision || '', // revision will be set
        cacheDir: initialOptions.cacheDir || '', // cacheDir will be set
        snapshotsDir: initialOptions.snapshotsDir || '', // snapshotsDir will be set
        hosts: initialOptions.hosts || [], // hosts will be set
    };
    mergedOptions.hosts = getHostsList(mergedOptions);
    mergedOptions.cacheDir = resolveCacheDir(mergedOptions);
    mergedOptions.snapshotsDir = resolveSnapshotsDir(mergedOptions);
    // platform and revision are resolved later in the main PCR flow
    return mergedOptions;
};
exports.getResolvedOptions = getResolvedOptions;
const launchHandler = async (options) => {
    options.launchable = false; // Reset before trying
    if (!options.executablePath) {
        util_1.default.output('No executable path provided for launch test.', true);
        return;
    }
    try {
        const browser = await puppeteer_core_1.default.launch({
            headless: 'new', // Cast 'new' to any to satisfy type-checker
            args: ['--no-sandbox'], // Common for CI/server environments
            executablePath: options.executablePath,
        }); // Cast the whole options object if needed, or just the property
        options.launchable = true;
        options.chromiumVersion = await browser.version();
        await browser.close();
        await util_1.default.delay(500); // Original delay
    }
    catch (error) {
        util_1.default.output(`Launch test failed: ${error.message || String(error)}`, true);
        // console.log(error); // Original console.log
    }
};
const getCurrentPuppeteerVersion = () => {
    const version = util_1.default.getPuppeteerVersion();
    if (!version) {
        util_1.default.output('Failed to get Puppeteer version.', true);
        return undefined;
    }
    util_1.default.output(`Puppeteer version: ${EC.magenta(version)}`);
    return version;
};
const getCurrentBrowserPlatform = () => {
    const platform = util_1.default.detectBrowserPlatform();
    if (!platform) {
        util_1.default.output('Failed to detect browser platform.', true);
        return undefined;
    }
    util_1.default.output(`Browser platform: ${EC.magenta(platform)}`);
    return platform;
};
const resolveChromiumRevision = async (options) => {
    let revision = options.revision || process.env.PUPPETEER_REVISION;
    if (!revision) {
        if (!options.platform) {
            util_1.default.output('Cannot resolve revision without platform.', true);
            // Consider throwing an error or returning a specific marker
            return ''; // Or a default/fallback revision if appropriate
        }
        revision = await util_1.default.resolveBuildId(options.platform);
    }
    util_1.default.output(`Chromium revision: ${EC.magenta(revision)}`);
    return revision;
};
const generateStatsInfo = (options) => {
    const stats = {
        puppeteerVersion: options.puppeteerVersion,
        platform: options.platform, // platform should be set by now
        revision: options.revision, // revision should be set by now
        cacheDir: util_1.default.formatPath(options.cacheDir),
        snapshotsDir: util_1.default.formatPath(options.snapshotsDir),
        puppeteer: puppeteer_core_1.default, // Attach the puppeteer module instance
    };
    if (options.executablePath) {
        const formattedPath = util_1.default.formatPath(options.executablePath);
        stats.executablePath = formattedPath;
        const exists = fs.existsSync(formattedPath);
        util_1.default.output(`Chromium executablePath: ${exists ? EC.green(formattedPath) : EC.red(formattedPath)}`);
    }
    if (options.chromiumVersion) {
        stats.chromiumVersion = options.chromiumVersion;
        util_1.default.output(`Chromium version: ${EC.magenta(options.chromiumVersion)}`);
    }
    if (typeof options.launchable === 'boolean') {
        stats.launchable = options.launchable;
        util_1.default.output(`Chromium launchable: ${options.launchable ? EC.green('true') : EC.red('false')}`);
    }
    // Save before returning (excluding the 'puppeteer' instance from JSON)
    const { puppeteer: _, ...savableStats } = stats;
    saveStatsToFile(options, savableStats);
    return stats;
};
const getStatsPath = (options = {}) => {
    const statsDir = options.cacheDir || os.homedir();
    const statsName = options.statsName || options_1.default.statsName;
    return path.resolve(statsDir, statsName);
};
const saveStatsToFile = (options, statsData) => {
    const statsPath = getStatsPath(options);
    try {
        fs.writeFileSync(statsPath, JSON.stringify(statsData, null, 4));
        util_1.default.output(`Stats saved: ${util_1.default.formatPath(statsPath)}`);
    }
    catch (e) {
        util_1.default.output(`Failed to save stats: ${util_1.default.formatPath(statsPath)} - ${e.message}`, true);
    }
};
const getStatsFromFile = (optionsInput) => {
    // Ensure options used for getStatsPath are resolved enough to have cacheDir and statsName
    const optsForPath = optionsInput
        ? { cacheDir: optionsInput.cacheDir, statsName: optionsInput.statsName }
        : {};
    const statsPath = getStatsPath(optsForPath);
    try {
        const fileContent = fs.readFileSync(statsPath, 'utf-8');
        const statsFromFile = JSON.parse(fileContent);
        return {
            ...statsFromFile,
            puppeteer: puppeteer_core_1.default, // Re-attach puppeteer module instance
        };
    }
    catch (e) {
        util_1.default.output('Not found PCR stats cache or error reading it. Try npm install again.', true);
        return undefined;
    }
};
exports.getStatsFromFile = getStatsFromFile;
const PCR = async (initialOptions) => {
    const options = (0, exports.getResolvedOptions)(initialOptions);
    util_1.default.silent = true; // Check cache silently first
    const cachedStats = (0, exports.getStatsFromFile)(options);
    if (cachedStats &&
        cachedStats.executablePath &&
        fs.existsSync(cachedStats.executablePath)) {
        // If a specific revision is requested, ensure cache matches
        if (!options.revision ||
            (options.revision && options.revision === cachedStats.revision)) {
            util_1.default.silent = options.silent; // Restore user's silent setting
            util_1.default.output('Using cached Chromium information.');
            // Update output with cached info if not silent
            if (!options.silent) {
                generateStatsInfo({
                    ...options,
                    ...cachedStats,
                    puppeteerVersion: cachedStats.puppeteerVersion || getCurrentPuppeteerVersion(),
                }); // Re-log with current settings
            }
            return cachedStats;
        }
    }
    util_1.default.silent = options.silent; // Restore user's silent setting for subsequent operations
    options.puppeteerVersion = getCurrentPuppeteerVersion();
    const platform = getCurrentBrowserPlatform();
    if (!platform) {
        util_1.default.output('Could not determine platform. Aborting.', true);
        return undefined; // Cannot proceed without a platform
    }
    options.platform = platform;
    options.revision = await resolveChromiumRevision(options);
    if (!options.revision) {
        util_1.default.output('Could not determine revision. Aborting.', true);
        return undefined; // Cannot proceed without a revision
    }
    // At this point, options.platform and options.revision are definitely set.
    // And options.snapshotsDir is also set via getResolvedOptions.
    const localChromiumFound = (0, detect_1.default)(options); // detectLocalChromium mutates options.executablePath
    if (!localChromiumFound) {
        util_1.default.output('Local Chromium not found. Attempting download...');
        // downloadChromium expects platform, revision, snapshotsDir, hosts, retry
        await (0, download_1.default)(options); // downloadChromium mutates options.installedBrowser and options.executablePath
    }
    // If executablePath is found (either detected or downloaded), try to launch
    if (options.executablePath) {
        await launchHandler(options); // mutates options.launchable and options.chromiumVersion
    }
    else {
        util_1.default.output('No executable path found after detection and download attempts.', true);
        options.launchable = false;
    }
    util_1.default.closeGauge(); // Ensure gauge is closed
    const finalStats = generateStatsInfo(options);
    return finalStats;
};
// Attach methods to PCR function object to mimic original API
PCR.getOptions = exports.getResolvedOptions;
PCR.getStats = (options) => {
    const resolvedOpts = (0, exports.getResolvedOptions)(options);
    return (0, exports.getStatsFromFile)(resolvedOpts);
};
exports.default = PCR;
//# sourceMappingURL=index.js.map