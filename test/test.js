const fs = require('fs');
const path = require('path');
const EC = require('eight-colors');
const rimraf = require('rimraf');
const assert = require('assert');

const PCR = require(path.resolve(__dirname, '../lib/index.js'));

// utils
const cleanSnapshotsDir = (options) => {
    const snapshotsDir = options.snapshotsDir;
    if (fs.existsSync(snapshotsDir)) {
        console.log(`${EC.cyan('[clean]')} remove chromium snapshots dir: ${EC.magenta(snapshotsDir)} ...`);
        rimraf.nativeSync(snapshotsDir);
    }
};

const cleanStatsFile = (options) => {
    const statsPath = path.resolve(options.cacheDir, options.statsName);
    if (fs.existsSync(statsPath)) {
        console.log(`${EC.cyan('[clean]')} remove stats cache: ${EC.magenta(statsPath)} ...`);
        rimraf.nativeSync(statsPath);
    }
};

const cleanAll = (options) => {
    cleanSnapshotsDir(options);
    cleanStatsFile(options);
};

describe('puppeteer-chromium-resolver', function() {
    this.timeout(30 * 1000);

    it('reinstall with default options', async () => {

        const mergedOptions = PCR.getOptions();
        cleanAll(mergedOptions);

        const options = {};
        const stats = await PCR(options);
        assert(fs.existsSync(stats.executablePath));
    });


    it('async PCR with default options', async () => {
        const options = {};
        const stats = await PCR(options);
        assert(fs.existsSync(stats.executablePath));
    });

    it('sync getStats', () => {
        const stats = PCR.getStats();
        assert(fs.existsSync(stats.executablePath));
    });

    it('async PCR without stats cache', async () => {
        const mergedOptions = PCR.getOptions();
        cleanStatsFile(mergedOptions);

        const options = {};
        const stats = await PCR(options);
        assert(fs.existsSync(stats.executablePath));
    });

    it('async PCR with revision: 1095419', async () => {
        const options = {
            revision: '1095419'
        };
        const stats = await PCR(options);
        assert(fs.existsSync(stats.executablePath));
    });

    it('sync getStats with revision: 1095419', () => {
        const options = {
            revision: '1095419'
        };
        const stats = PCR.getStats(options);
        assert(fs.existsSync(stats.executablePath));
    });

    it('async PCR with downloadPath: .temp', async () => {
        const options = {
            downloadPath: '.temp'
        };

        const mergedOptions = PCR.getOptions(options);
        cleanAll(mergedOptions);

        const stats = await PCR(options);
        assert(fs.existsSync(stats.executablePath));
    });

    it('sync getStats with downloadPath: .temp', () => {
        const options = {
            downloadPath: '.temp'
        };
        const stats = PCR.getStats(options);
        assert(fs.existsSync(stats.executablePath));
    });

    it('async PCR with detectionPath: .temp', async () => {
        const options = {
            detectionPath: '.temp'
        };
        const stats = await PCR(options);
        assert(fs.existsSync(stats.executablePath));
    });

    it('launch browser and open page', async () => {

        const stats = await PCR();

        const browser = await stats.puppeteer.launch({
            headless: false,
            args: ['--no-sandbox'],
            executablePath: stats.executablePath
        }).catch(function(err) {
            console.error(err);
        });
        const page = await browser.newPage();
        await page.goto('https://www.npmjs.com/package/puppeteer-chromium-resolver');

        const title = await page.$eval('head title', (el) => el.innerText);
        assert.equal(title, 'puppeteer-chromium-resolver - npm');

        await browser.close().catch(function(err) {
            console.error(err);
        });

    });

});
