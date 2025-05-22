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
const http = __importStar(require("http"));
const https = __importStar(require("https"));
const url_1 = require("url"); // Renamed to avoid conflict with global URL
const EC = __importStar(require("eight-colors"));
const PB = __importStar(require("@puppeteer/browsers"));
const gauge_1 = __importDefault(require("gauge"));
const Util = {
    silent: false,
    gauge: null,
    detectBrowserPlatform: () => {
        return PB.detectBrowserPlatform();
    },
    resolveBuildId: async (platform, tag = 'latest') => {
        const buildId = await PB.resolveBuildId(PB.Browser.CHROMIUM, platform, tag).catch((e) => {
            // console.error('Error resolving buildId:', e);
        });
        return buildId || '1337728';
    },
    install: (options) => {
        const installOptions = {
            ...options, // options already contains cacheDir, buildId, platform etc.
            browser: PB.Browser.CHROMIUM,
            unpack: true,
        };
        return PB.install(installOptions);
    },
    computeExecutablePath: (options) => {
        // Parameters<typeof PB.computeExecutablePath>[0] correctly infers the type:
        // { browser: Browser; platform?: BrowserPlatform; buildId: string; cacheDir: string; }
        const computeOptions = {
            buildId: options.buildId,
            cacheDir: options.cacheDir,
            platform: options.platform,
            browser: PB.Browser.CHROMIUM,
        };
        return PB.computeExecutablePath(computeOptions);
    },
    getPuppeteerVersion: () => {
        let config;
        try {
            config = require('puppeteer-core/package.json');
        }
        catch (e) {
            return undefined;
        }
        if (config && typeof config.version === 'string') {
            return config.version;
        }
        return undefined;
    },
    headRequest: (url) => {
        return new Promise((resolve) => {
            const urlParsed = new url_1.URL(url);
            let client;
            if (urlParsed.protocol === 'https:') {
                client = https;
            }
            else {
                client = http;
            }
            const requestOptions = {
                protocol: urlParsed.protocol,
                hostname: urlParsed.hostname,
                port: urlParsed.port,
                path: urlParsed.pathname + urlParsed.search,
                method: 'HEAD',
            };
            const request = client.request(requestOptions);
            request.setTimeout(3000);
            request.end();
            const onFinish = (value) => {
                if (!request.destroyed) {
                    request.destroy();
                }
                resolve(value);
            };
            request.on('error', (error) => {
                onFinish(false);
            });
            request.on('timeout', () => {
                onFinish(false);
            });
            request.on('close', () => {
                // No specific action needed here
            });
            request.on('response', (res) => {
                const { statusCode, headers } = res;
                if (statusCode &&
                    statusCode >= 300 &&
                    statusCode < 400 &&
                    headers.location) {
                    onFinish(Util.headRequest(headers.location));
                    return;
                }
                onFinish(statusCode === 200);
            });
        });
    },
    output: (msg, isError) => {
        if (!Util.silent) {
            if (isError) {
                console.log(EC.red(`[PCR] ${msg}`));
            }
            else {
                console.log(`[PCR] ${msg}`);
            }
        }
    },
    delay: function (ms) {
        return new Promise((resolve) => {
            if (ms) {
                setTimeout(resolve, ms);
            }
            else {
                setImmediate(resolve);
            }
        });
    },
    createGauge: () => {
        Util.closeGauge();
        Util.gauge = new gauge_1.default();
    },
    closeGauge: () => {
        if (!Util.gauge) {
            return;
        }
        Util.gauge.disable();
        Util.gauge.hide();
        Util.gauge = null;
    },
    showProgress: (downloadedBytes, totalBytes) => {
        let per = 0;
        if (totalBytes > 0) {
            per = downloadedBytes / totalBytes;
        }
        if (Util.gauge) {
            Util.gauge.show(`Downloading Chromium - ${Util.toMegabytes(downloadedBytes)} / ${Util.toMegabytes(totalBytes)}`, per);
        }
    },
    toMegabytes: (bytes) => {
        const mb = bytes / 1024 / 1024;
        return `${Math.round(mb * 10) / 10} Mb`;
    },
    formatPath: (str) => {
        if (str) {
            return str.replace(/\\\\/g, '/');
        }
        return str;
    },
    isList: (data) => {
        return Array.isArray(data) && data.length > 0;
    },
};
exports.default = Util;
//# sourceMappingURL=util.js.map