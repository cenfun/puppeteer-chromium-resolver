
# Puppeteer Chromium Resolver
> Tool to resolve puppeteer and chromium faster, detect local installed chromium, download chromium with custom mirror host, cache chromium revision out of node_modules, test chromium headless being launchable.

![GitHub](https://img.shields.io/github/license/cenfun/puppeteer-chromium-resolver)
![npm](https://img.shields.io/npm/v/puppeteer-chromium-resolver)
![npm](https://img.shields.io/npm/dw/puppeteer-chromium-resolver)

* Tool to customize [puppeteer](https://github.com/GoogleChrome/puppeteer)
* Detect local chromium automatically
* Download chromium from custom mirror host
* Cache chromium to local folder
* Try launching chromium and resolve launchable and version
* Resolve chromium executablePath and puppeteer


## Install 
```sh
npm i puppeteer-chromium-resolver
```
## Usage
### [Async] dynamic detection and downloading chromium
```js
(async () => {
    const PCR = require("puppeteer-chromium-resolver");
    const option = {
        revision: "",
        detectionPath: "",
        folderName: ".chromium-browser-snapshots",
        defaultHosts: ["https://storage.googleapis.com", "https://npm.taobao.org/mirrors"],
        hosts: [],
        cacheRevisions: 2,
        retry: 3,
        silent: false
    };
    const stats = await PCR(option);
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
```

### [Sync] chromium will be pre-downloaded when PCR installation, so calling getStats() will get PCR stats from previous installation.
```js
const PCR = require("puppeteer-chromium-resolver");
const stats = PCR.getStats();
if (stats) {
    stats.puppeteer.launch({
        headless: false,
        args: ["--no-sandbox"],
        executablePath: stats.executablePath
    }).then(function(browser){
        //...
    }).catch(function(error) {
        console.log(error);
    });
}
```

### Option from root package.json with "pcr" object
```json
{
    "name": "",
    "version": "",
    "dependencies": {},

    "pcr": {
        "revision": "869685"
    }

}
```

## Return Stats
|Property        | Type    |                          |
| :--------------| :------ | :----------------------  |
|revision        | String  |current chromium revision |
|executablePath  | String  |chromium executable path  |
|folderPath      | String  |chromium folder path      |
|local           | Boolean |exists local chromium     |
|url             | String  |chromium download url     |
|launchable      | Boolean |chromium launchable       |
|chromiumVersion | String  |chromium version          |
|puppeteerVersion| String  |puppeteer version         |
|puppeteer       | Object  |puppeteer module          |


### How to make puppeteer work with puppeteer-chromium-resolver
* 1, Stop the automatic download of Chromium with following settings in .npmrc 
```
puppeteer_skip_download = true
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD = true
```
(one more setting for puppeteer v2.x)

* 2, Sets env PUPPETEER_EXECUTABLE_PATH to PCR executablePath globally or pass in launch option executablePath
```js
(async () => {

    const PCR = require("puppeteer-chromium-resolver");
    const puppeteer = require("puppeteer");
    const stats = await PCR();
    //update global env
    process.env.PUPPETEER_EXECUTABLE_PATH = stats.executablePath;

    //or specify executablePath
    const browser = await puppeteer.launch({
        executablePath: stats.executablePath,
        headless: false
    });

})();
```


## CHANGELOG 
[CHANGELOG.md](CHANGELOG.md)