const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer-core");
const PCR = require(path.resolve(__dirname, "../index.js"));

const caseWithSync = () => {
    console.log("case with sync ...");

    const stats = PCR.getStats();
    return stats;
};

const caseWithCache = async () => {
    console.log("case with cache ...");
    
    const option = {};
    const stats = await PCR(option);
    return stats;
};

const caseWithoutCache = async () => {
    console.log("case without cache ...");
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

const caseWithInstall = async () => {
    console.log("case with install ...");
    const option = {};
    const stats = await PCR(option);
    return stats;
};

const caseWithReinstall = async () => {
    console.log("case with reinstall ...");
    
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

(async () => {

    let stats = await caseWithSync();
    console.log(stats.executablePath);
    console.log("===========================================================");
    
    stats = await caseWithCache();
    console.log(stats.executablePath);
    console.log("===========================================================");

    stats = await caseWithoutCache();
    console.log(stats.executablePath);
    console.log("===========================================================");

    stats = await caseWithInstall();
    console.log(stats.executablePath);
    console.log("===========================================================");

    stats = await caseWithReinstall();
    console.log(stats.executablePath);
    console.log("===========================================================");

    const browser = await stats.puppeteer.launch({
        headless: false,
        args: ["--no-sandbox"],
        executablePath: stats.executablePath
    }).catch(function(error) {
        console.log(error);
    });
    const page = await browser.newPage();
    await page.goto("https://www.npmjs.com/package/puppeteer-chromium-resolver");
    await browser.close();

})();