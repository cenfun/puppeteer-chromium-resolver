const fs = require('fs');
const path = require('path');
const EC = require('eight-colors');
const PCR = require(path.resolve(__dirname, '../lib/index.js'));

const caseWithSync = () => {
    console.log(EC.magenta('sync case with cache ...'));

    const stats = PCR.getStats();
    return stats;
};

const caseWithCache = async () => {
    console.log(EC.magenta('async case with cache ...'));

    const option = {
        revision: '1095419'
    };
    const stats = await PCR(option);
    return stats;
};

const caseWithoutCache = async () => {
    console.log(EC.magenta('async case without cache ...'));
    // remove cache
    const cachePath = PCR.getStatsPath();
    if (fs.existsSync(cachePath)) {
        console.log('remove stats cache ...');
        fs.rmSync(cachePath);
    }
    const option = {};
    const stats = await PCR(option);
    return stats;
};

const caseWithReinstall = async () => {
    console.log(EC.magenta('async case with reinstall ...'));

    const cachePath = PCR.getStatsPath();

    const json = require(cachePath);
    // remove chromium
    if (fs.existsSync(json.folderPath)) {
        console.log(`remove chromium ${json.revision} ...`);
        const browserFetcher = PCR.createBrowserFetcher({
            path: json.snapshotsDir
        });
        await browserFetcher.remove(json.revision);
    }

    // remove cache
    if (fs.existsSync(cachePath)) {
        console.log('remove stats cache ...');
        fs.rmSync(cachePath);
    }

    const option = {};
    const stats = await PCR(option);
    return stats;
};

const delay = function(ms) {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve();
        }, ms);
    });
};

const main = async () => {

    let stats = await caseWithSync();
    if (stats) {
        console.log(EC.green(stats.executablePath));
    }
    console.log('================================================================================');

    stats = await caseWithCache();
    console.log(EC.green(stats.executablePath));
    console.log('================================================================================');

    stats = await caseWithoutCache();
    console.log(EC.green(stats.executablePath));
    console.log('================================================================================');

    stats = await caseWithReinstall();
    console.log(EC.green(stats.executablePath));
    console.log('================================================================================');

    console.log(EC.magenta('launch browser and open page ...'));

    const browser = await stats.puppeteer.launch({
        headless: false,
        args: ['--no-sandbox'],
        executablePath: stats.executablePath
    }).catch(function(err) {
        console.error(err);
    });
    const page = await browser.newPage();
    await page.goto('https://www.npmjs.com/package/puppeteer-chromium-resolver');
    await delay(1000);
    await browser.close().catch(function(err) {
        console.error(err);
    });

    console.log(EC.green('test done'));

};

main();
