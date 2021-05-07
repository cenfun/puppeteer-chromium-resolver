const fs = require("fs");
const path = require("path");
const EC = require("eight-colors");
const puppeteer = require("puppeteer-core");
const PCR = require(path.resolve(__dirname, "../index.js"));

const caseWithSync = () => {
    console.log(EC.magenta("sync case with cache ..."));

    const stats = PCR.getStats();
    return stats;
};

const caseWithCache = async () => {
    console.log(EC.magenta("async case with cache ..."));
    
    const option = {};
    const stats = await PCR(option);
    return stats;
};

const caseWithoutCache = async () => {
    console.log(EC.magenta("async case without cache ..."));
    //remove cache
    const cachePath = path.resolve(__dirname, "../.stats.json");
    if (fs.existsSync(cachePath)) {
        console.log("remove stats cache ...");
        fs.rmSync(cachePath);
    }
    const option = {};
    const stats = await PCR(option);
    return stats;
};

const caseWithReinstall = async () => {
    console.log(EC.magenta("async case with reinstall ..."));
    
    const cachePath = path.resolve(__dirname, "../.stats.json");

    const json = require(cachePath);
    //remove chromium
    if (fs.existsSync(json.folderPath)) {
        console.log(`remove chromium ${json.revision} ...`);
        const browserFetcher = puppeteer.createBrowserFetcher({
            path: json.userFolder
        });
        await browserFetcher.remove(json.revision);
    }

    //remove cache
    if (fs.existsSync(cachePath)) {
        console.log("remove stats cache ...");
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

(async () => {

    let stats = await caseWithSync();
    if (stats) {
        console.log(EC.green(stats.executablePath));
    }
    console.log("================================================================================");
    
    stats = await caseWithCache();
    console.log(EC.green(stats.executablePath));
    console.log("================================================================================");

    stats = await caseWithoutCache();
    console.log(EC.green(stats.executablePath));
    console.log("================================================================================");

    stats = await caseWithReinstall();
    console.log(EC.green(stats.executablePath));
    console.log("================================================================================");

    console.log(EC.magenta("launch browser and open page ..."));

    const browser = await stats.puppeteer.launch({
        headless: false,
        args: ["--no-sandbox"],
        executablePath: stats.executablePath
    }).catch(function(error) {
        console.log(error);
    });
    await browser.newPage();
    await delay(1000);
    await browser.close().catch(function(error) {
        console.log(error);
    });

    console.log(EC.green("test done"));

})();