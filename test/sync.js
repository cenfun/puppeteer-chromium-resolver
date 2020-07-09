(async () => {

    const PCR = require("../index.js");
    const pcr = PCR.getStats();
    if (!pcr) {
        console.log("Not found PCR stats, try install again.");
        return;
    }
    const browser = await pcr.puppeteer.launch({
        headless: false,
        args: ["--no-sandbox"],
        executablePath: pcr.executablePath
    }).catch(function(error) {
        console.log(error);
    });
    const page = await browser.newPage();
    await page.goto("https://www.npmjs.com/package/puppeteer-chromium-resolver");
    await browser.close();

})();