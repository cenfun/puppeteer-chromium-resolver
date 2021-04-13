const fs = require("fs");
const path = require("path");

(async () => {

    console.log("test async ...");

    //remove cache
    const cachePath = path.resolve(__dirname, "../.stats.json");
    if (fs.existsSync(cachePath)) {
        console.log("remove stats cache ...");
        fs.rmSync(cachePath);
    }

    const PCR = require(path.resolve(__dirname, "../index.js"));
    const option = {};
    const stats = await PCR.get(option);

    console.log(stats);

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