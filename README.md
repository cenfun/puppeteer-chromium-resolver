
# Puppeteer Chromium Resolver
* A tool to customize puppeteer
* Able to download chromium from custom/mirror host.
* Save chromium to global user/temp folder, saving disk space and do not download again if exists
* Returns [puppeteer](https://github.com/GoogleChrome/puppeteer) and executablePath

## Install 
```
npm install puppeteer-chromium-resolver --save
```
## Usage
```
require("puppeteer-chromium-resolver")({
    //hosts: ["https://storage.googleapis.com", "https://npm.taobao.org/mirrors"]
}).then(function (revisionInfo) {
    console.log("Chromium revision installed.");
    revisionInfo.puppeteer.launch({
        headless: false,
        executablePath: revisionInfo.executablePath
    });
});

```
