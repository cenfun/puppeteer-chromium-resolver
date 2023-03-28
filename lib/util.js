const http = require('http');
const https = require('https');
const URL = require('url');
const EC = require('eight-colors');
const puppeteer = require('puppeteer-core');
const Gauge = require('gauge');

const Util = {

    getPuppeteerChromiumRevision: () => {
        const revisions = puppeteer.PUPPETEER_REVISIONS;
        if (revisions) {
            return revisions.chromium;
        }
        return '1108766';
    },

    createBrowserFetcher: (options) => {
        return new puppeteer.BrowserFetcher(options);
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

            request.on('error', (error) => {
                // console.error(error);
                resolve(false);
            });

            request.on('timeout', (error) => {
                resolve(false);
            });

            request.on('close', (error) => {
                resolve(false);
            });

            request.on('response', (res) => {

                const { statusCode, headers } = res;
                if (statusCode && statusCode >= 300 && statusCode < 400 && headers.location) {
                    // console.log(`redirection: ${headers.location}`);
                    resolve(Util.headRequest(headers.location));
                    return;
                }

                resolve(statusCode === 200);

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


    createGauge: () => {
        Util.closeGauge();
        Util.gauge = new Gauge();
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
        if (totalBytes) {
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
