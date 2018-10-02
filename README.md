
# puppeteer-chromium-resolver

* Easy way to download chromium from mirror host.
* Save chromium to global temp path, no needs download again when removed node_modules

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
