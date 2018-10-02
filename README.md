
# puppeteer-chromium-resolver

* Easy way to download chromium from mirror host.
* Save chromium to global user/temp folder, saving disk space and do not download again if exists

```
require("puppeteer-chromium-resolver")({
    hosts: ["https://storage.googleapis.com", "https://npm.taobao.org/mirrors"]
}).then(function (revisionInfo) {
    console.log("Chromium revision installed.");
    revisionInfo.puppeteer.launch({
        headless: false,
        executablePath: revisionInfo.executablePath
    });
});

```
