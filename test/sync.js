(async () => {

    const PCR = require("../resolver.js");
    const stats = PCR.getStats();
    if (!stats) {
        return;
    }
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
