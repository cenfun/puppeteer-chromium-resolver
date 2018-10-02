require("./index.js")({}).then(function (revisionInfo) {
    console.log("Chromium revision installed.");
    /*
    //test
    revisionInfo.puppeteer.launch({
        headless: false,
        executablePath: revisionInfo.executablePath
    });
    */
});