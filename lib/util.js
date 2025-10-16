const http = require('http');
const https = require('https');
const URL = require('url');
const EC = require('eight-colors');
const PB = require('@puppeteer/browsers');
const cliProgress = require('cli-progress');

const Util = {

    detectBrowserPlatform: () => {
        return PB.detectBrowserPlatform();
    },

    resolveBuildId: async (platform, tag = 'latest') => {
        const buildId = await PB.resolveBuildId(PB.Browser.CHROMIUM, platform, tag).catch((e) => {
            // console.log(e);
        });
        // console.log('resolveBuildId', buildId);
        return buildId || '1337728';
    },

    install: (options) => {
        return PB.install({
            browser: PB.Browser.CHROMIUM,
            ... options
        });
    },

    computeExecutablePath: (options) => {
        return PB.computeExecutablePath({
            browser: PB.Browser.CHROMIUM,
            ... options
        });
    },

    getPuppeteerVersion: () => {
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
    },

    headRequest: (url) => {
        return new Promise((resolve) => {

            const urlParsed = URL.parse(url);

            // console.log(urlParsed);

            let isHttps = false;
            if (urlParsed.protocol === 'https:') {
                isHttps = true;
            }

            const options = {
                ... urlParsed,
                method: 'HEAD'
            };
            const request = isHttps ? https.request(options) : http.request(options);
            request.setTimeout(3000);
            request.end();

            const onFinish = (value) => {
                request.destroy();
                resolve(value);
            };

            request.on('error', (error) => {
                // console.error(error);
                onFinish(false);
            });

            request.on('timeout', (error) => {
                onFinish(false);
            });

            request.on('close', (error) => {
                onFinish(false);
            });

            request.on('response', (res) => {

                const { statusCode, headers } = res;
                if (statusCode && statusCode >= 300 && statusCode < 400 && headers.location) {
                    // console.log(`redirection: ${headers.location}`);
                    onFinish(Util.headRequest(headers.location));
                    return;
                }

                onFinish(statusCode === 200);

            });

        });
    },

    // =====================================================================================

    silent: false,
    output: (msg, isError) => {
        if (!Util.silent) {
            if (isError) {
                console.log(EC.red(`[PCR] ${msg}`));
            } else {
                console.log(`[PCR] ${msg}`);
            }
        }
    },

    delay: function(ms) {
        return new Promise((resolve) => {
            if (ms) {
                setTimeout(resolve, ms);
            } else {
                setImmediate(resolve);
            }
        });
    },

    createGauge: () => {
        Util.closeGauge();
        Util.progressBar = new cliProgress.SingleBar({
            format: 'Downloading Chromium - {downloadedMB} / {totalMB} [{bar}] {percentage}%',
            barCompleteChar: '\u2588',
            barIncompleteChar: '\u2591',
            hideCursor: true,
            clearOnComplete: false,
            stopOnComplete: false
        }, cliProgress.Presets.shades_classic);
        Util.progressBarStarted = false;
    },

    closeGauge: () => {
        if (!Util.progressBar) {
            return;
        }
        if (Util.progressBarStarted) {
            Util.progressBar.stop();
        }
        Util.progressBar = null;
        Util.progressBarStarted = false;
    },

    showProgress: (downloadedBytes, totalBytes) => {
        if (!Util.progressBar) {
            return;
        }

        const downloadedMB = Util.toMegabytes(downloadedBytes);
        const totalMB = Util.toMegabytes(totalBytes);

        if (!Util.progressBarStarted && totalBytes > 0) {
            Util.progressBar.start(totalBytes, downloadedBytes, {
                downloadedMB,
                totalMB
            });
            Util.progressBarStarted = true;
        } else if (Util.progressBarStarted) {
            Util.progressBar.update(downloadedBytes, {
                downloadedMB,
                totalMB
            });
        }
    },

    toMegabytes: (bytes) => {
        const mb = bytes / 1024 / 1024;
        return `${Math.round(mb * 10) / 10} Mb`;
    },

    // \ to /
    formatPath: (str) => {
        if (str) {
            str = str.replace(/\\/g, '/');
        }
        return str;
    },

    isList: (data) => {
        if (data && data instanceof Array && data.length > 0) {
            return true;
        }
        return false;
    }

};

module.exports = Util;
