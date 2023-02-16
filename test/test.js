const fs = require('fs');
const path = require('path');
const EC = require('eight-colors');
const rimraf = require('rimraf');
const assert = require('assert');

const PCR = require(path.resolve(__dirname, '../lib/index.js'));

describe('puppeteer-chromium-resolver', function() {
    this.timeout(30 * 1000);

    it('reinstall with default options', async () => {

        const options = PCR.getOptions();

        // remove all local chromium
        const snapshotsDir = options.snapshotsDir;
        if (fs.existsSync(snapshotsDir)) {
            console.log(`remove chromium snapshots dir: ${EC.magenta(snapshotsDir)} ...`);
            rimraf.nativeSync(snapshotsDir);
        }

        // remove stats cache
        const statsPath = path.resolve(options.cacheDir, options.statsName);
        if (fs.existsSync(statsPath)) {
            console.log(`remove stats cache: ${EC.magenta(statsPath)} ...`);
            rimraf.nativeSync(statsPath);
        }

        const option = {};
        const stats = await PCR(option);
        assert(stats.executablePath);
    });


    it('async PCR with default options', async () => {
        const options = {};
        const stats = await PCR(options);
        assert(stats.executablePath);
    });

    it('sync getStats', () => {
        const stats = PCR.getStats();
        assert(stats.executablePath);
    });

    it('async PCR without stats cache', async () => {
        const options = PCR.getOptions();

        const statsPath = path.resolve(options.cacheDir, options.statsName);
        if (fs.existsSync(statsPath)) {
            console.log(`remove stats cache: ${EC.magenta(statsPath)} ...`);
            rimraf.nativeSync(statsPath);
        }

        const option = {};
        const stats = await PCR(option);
        assert(stats.executablePath);
    });

    it('async PCR with revision: 1095419', async () => {
        const options = {
            revision: '1095419'
        };
        const stats = await PCR(options);
        assert(stats.executablePath);
    });

    it('sync getStats with revision: 1095419', () => {
        const options = {
            revision: '1095419'
        };
        const stats = PCR.getStats(options);
        assert(stats.executablePath);
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
