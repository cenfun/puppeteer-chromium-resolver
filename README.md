
# Puppeteer Chromium Resolver
* A tool to customize puppeteer
* Able to download chromium from custom/mirror host.
* Save chromium to user path, saving space and using cache if exists
* Returns [puppeteer](https://github.com/GoogleChrome/puppeteer) and executablePath

## Install 
```
npm install puppeteer-chromium-resolver --save
```
## Usage
```
require("puppeteer-chromium-resolver")({
    //savePath: "./",
    //hosts: ["https://storage.googleapis.com", "https://npm.taobao.org/mirrors"]
}).then(function (revisionInfo) {
    console.log("Chromium revision installed and launchable is " + revisionInfo.launchable);
    revisionInfo.puppeteer.launch({
        headless: true,
        args: ['--no-sandbox'],
        executablePath: revisionInfo.executablePath
    });
});

```
