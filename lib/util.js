const EC = require('eight-colors');
const puppeteer = require('puppeteer-core');

const Gauge = require('gauge');
const gauge = new Gauge();

const Util = {

    // console.log(puppeteer.PUPPETEER_REVISIONS);
    getPuppeteerChromiumRevision: () => {
        const revisions = puppeteer.PUPPETEER_REVISIONS;
        if (revisions) {
            return revisions.chromium;
        }
        return '1095492';
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

    // =====================================================================================

    silent: false,
    output: (msg, isError) => {
        gauge.disable();
        if (!Util.silent) {
            if (isError) {
                console.log(EC.red(`[PCR] ${msg}`));
            } else {
                console.log(`[PCR] ${msg}`);
            }
        }
        gauge.enable();
    },

    gaugeDisable: () => {
        gauge.disable();
    },

    toMegabytes: (bytes) => {
        const mb = bytes / 1024 / 1024;
        return `${Math.round(mb * 10) / 10} Mb`;
    },

    showProgress: (downloadedBytes, totalBytes) => {
        let per = 0;
        if (totalBytes) {
            per = downloadedBytes / totalBytes;
        }
        gauge.show(`Downloading Chromium - ${Util.toMegabytes(downloadedBytes)} / ${Util.toMegabytes(totalBytes)}`, per);
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
