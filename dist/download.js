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
const EC = __importStar(require("eight-colors"));
const util_1 = __importDefault(require("./util")); // Assuming util.ts exports Util as default
const PB = __importStar(require("@puppeteer/browsers")); // For PB.BrowserPlatform and PB.InstalledBrowser
function getFolderNameForPlatform(platform) {
    switch (platform) {
        case PB.BrowserPlatform.LINUX:
            return 'Linux_x64';
        case PB.BrowserPlatform.LINUX_ARM: // Added case
            return 'Linux_ARM';
        case PB.BrowserPlatform.MAC_ARM:
            return 'Mac_Arm';
        case PB.BrowserPlatform.MAC:
            return 'Mac';
        case PB.BrowserPlatform.WIN32:
            return 'Win';
        case PB.BrowserPlatform.WIN64:
            return 'Win_x64';
        default:
            // This should now be truly exhaustive if all PB.BrowserPlatform members are covered.
            // If @puppeteer/browsers adds new platforms, this will error, which is good.
            const exhaustiveCheck = platform;
            util_1.default.output(`Unknown platform for folder: ${exhaustiveCheck}`, true);
            return '';
    }
}
function getArchiveNameForPlatform(platform, buildId) {
    switch (platform) {
        case PB.BrowserPlatform.LINUX:
            return 'chrome-linux';
        case PB.BrowserPlatform.LINUX_ARM: // Added case
            return 'chrome-linux-arm'; // Assuming this is the archive name
        case PB.BrowserPlatform.MAC_ARM:
        case PB.BrowserPlatform.MAC:
            return 'chrome-mac';
        case PB.BrowserPlatform.WIN32:
        case PB.BrowserPlatform.WIN64:
            return parseInt(buildId, 10) > 591479 ? 'chrome-win' : 'chrome-win32';
        default:
            const exhaustiveCheck = platform;
            util_1.default.output(`Unknown platform for archive: ${exhaustiveCheck}`, true);
            return '';
    }
}
const resolveDownloadPathParts = (platform, buildId) => {
    return [
        getFolderNameForPlatform(platform),
        buildId,
        `${getArchiveNameForPlatform(platform, buildId)}.zip`,
    ];
};
const resolveDownloadUrl = (platform, buildId, baseUrl) => {
    return `${baseUrl}/${resolveDownloadPathParts(platform, buildId).join('/')}`;
};
const getBaseUrlForHost = (host) => {
    const trimmedHost = host.endsWith('/') ? host.slice(0, -1) : host;
    return `${trimmedHost}/chromium-browser-snapshots`;
};
const downloadFromHost = async (options, host) => {
    util_1.default.output(`Downloading from: ${host} ...`);
    util_1.default.createGauge();
    let failed = false;
    const installedBrowser = await util_1.default.install({
        baseUrl: getBaseUrlForHost(host),
        buildId: options.revision,
        cacheDir: options.snapshotsDir,
        platform: options.platform,
        downloadProgressCallback: (downloadedBytes, totalBytes) => {
            util_1.default.showProgress(downloadedBytes, totalBytes);
        },
    }).catch((error) => {
        failed = true;
        util_1.default.output(error.message || String(error), true);
    });
    await util_1.default.delay(500);
    util_1.default.closeGauge();
    if (failed || !installedBrowser) {
        return undefined;
    }
    util_1.default.output(`Chromium downloaded: ${installedBrowser.buildId}`);
    return installedBrowser;
};
const downloadStart = async (options, list) => {
    for (const item of list) {
        if (!item.ok)
            continue;
        const installedBrowser = await downloadFromHost(options, item.host);
        if (installedBrowser) {
            return installedBrowser;
        }
    }
    if ((options.retryNum || 0) < options.retry) {
        options.retryNum = (options.retryNum || 0) + 1;
        util_1.default.output(`Retry Chromium downloading ... (Attempt ${options.retryNum}/${options.retry})`);
        return downloadStart(options, list);
    }
    return undefined;
};
const preDownloadFromHost = async (options, host) => {
    const time_start = Date.now();
    const { platform, revision } = options;
    const baseUrl = getBaseUrlForHost(host);
    const downloadUrl = resolveDownloadUrl(platform, revision, baseUrl);
    const ok = await util_1.default.headRequest(downloadUrl);
    const time = Date.now() - time_start;
    const available = ok ? EC.green(String(ok)) : EC.red(String(ok));
    util_1.default.output(`Head request: ${downloadUrl} - ${available} (${time}ms)`);
    return {
        host,
        time,
        ok,
        downloadUrl,
    };
};
const preDownloadStart = async (options) => {
    const list = await Promise.all(options.hosts.map((host) => preDownloadFromHost(options, host)));
    list.sort((a, b) => {
        if (a.ok && !b.ok)
            return -1;
        if (!a.ok && b.ok)
            return 1;
        return a.time - b.time;
    });
    return list;
};
const downloadChromium = async (options) => {
    const list = await preDownloadStart(options);
    options.retryNum = 0;
    const installedBrowser = await downloadStart(options, list);
    if (installedBrowser) {
        options.installedBrowser = installedBrowser;
        options.executablePath = util_1.default.computeExecutablePath({
            platform: installedBrowser.platform,
            buildId: installedBrowser.buildId,
            cacheDir: options.snapshotsDir,
        });
    }
    else {
        util_1.default.output(`ERROR: Failed to download Chromium after retry ${options.retryNum || 0} times.`, true);
    }
};
exports.default = downloadChromium;
//# sourceMappingURL=download.js.map