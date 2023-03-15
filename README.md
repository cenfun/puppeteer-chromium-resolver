
# Puppeteer Chromium Resolver
> Tool to resolve puppeteer and chromium faster, detect local installed chromium, download chromium with custom mirror host, cache chromium revision out of node_modules, test chromium headless being launchable.

![](https://img.shields.io/npm/v/puppeteer-chromium-resolver)
![](https://img.shields.io/librariesio/github/cenfun/puppeteer-chromium-resolver)
![](https://img.shields.io/librariesio/dependents/npm/puppeteer-chromium-resolver)
[![](https://badgen.net/npm/dw/puppeteer-chromium-resolver)](https://www.npmjs.com/package/puppeteer-chromium-resolver)
![](https://img.shields.io/github/license/cenfun/puppeteer-chromium-resolver)

* Tool to customize [puppeteer](https://github.com/GoogleChrome/puppeteer)
* Detect local chromium automatically
* Download chromium from custom mirror host
* Cache chromium to custom local folder
* Try launching chromium and resolve launchable and version
* Resolve chromium executablePath and puppeteer


## Install 
```sh
npm i puppeteer-chromium-resolver
```
## Usage
### [Async] dynamic detection and downloading chromium
```js
const PCR = require("puppeteer-chromium-resolver");
const options = {};
const stats = await PCR(options);
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
```

### [Sync] chromium will be pre-downloaded when PCR installation, so calling getStats() will get PCR stats from previous installation.
```js
const PCR = require("puppeteer-chromium-resolver");
const options = {};
const stats = PCR.getStats(options);
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

## Default Options
```js
const options = {
    // the chromium revision to use
    // default is puppeteer.PUPPETEER_REVISIONS.chromium
    revision: '',

    // additional path to detect local chromium copy (separate with a comma if multiple paths)
    detectionPath: '',

    // custom path to download chromium to local, require dir permission: 0o777
    // default is user home dir
    downloadPath: '',

    // the folder name for chromium snapshots (maybe there are multiple versions)
    folderName: '.chromium-browser-snapshots',

    // the stats file name, cache stats info for latest installation
    statsName: '.pcr-stats.json',

    // default hosts are ['https://storage.googleapis.com', 'https://npmmirror.com/mirrors']
    hosts: [],

    cacheRevisions: 2,
    retry: 3,
    silent: false
};

```
see [lib/options.js](/lib/options.js)

### Option from root package.json with "pcr" object
```json
{
    // ...
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
|chromiumVersion | String  |chromium version          |
|launchable      | Boolean |chromium launchable       |
|puppeteerVersion| String  |puppeteer version         |
|puppeteer       | Object  |puppeteer module          |


## Test Cases
see [test/test.js](/test/test.js)

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

## Troubleshooting
- CentOS: error while loading shared libraries: libatk-1.0.so.0: cannot open shared objecsuch file or directory
```sh
# Install dependencies:
yum install -y alsa-lib.x86_64 \
atk.x86_64 \
cups-libs.x86_64 \
gtk3.x86_64 \
ipa-gothic-fonts \
libXcomposite.x86_64 \
libXcursor.x86_64 \
libXdamage.x86_64 \
libXext.x86_64 \
libXi.x86_64 \
libXrandr.x86_64 \
libXScrnSaver.x86_64 \
libXtst.x86_64 \
pango.x86_64 \
xorg-x11-fonts-100dpi \
xorg-x11-fonts-75dpi \
xorg-x11-fonts-cyrillic \
xorg-x11-fonts-misc \
xorg-x11-fonts-Type1 \
xorg-x11-utils

# After installing dependencies you need to update nss library:
yum update nss -y
```
more [https://github.com/puppeteer/puppeteer/blob/main/docs/troubleshooting.md](https://github.com/puppeteer/puppeteer/blob/main/docs/troubleshooting.md)

## Dependencies
```sh
nmls -p
┌───────────────────────────────┬─────────┬─────────┬──────┬───────────┬────────┐
│  Name                         │ Version │    Size │ Deps │ Deps Size │ Nested │
├───────────────────────────────┼─────────┼─────────┼──────┼───────────┼────────┤
│ └ puppeteer-chromium-resolver │ 19.2.0  │ 25.4 KB │   63 │   11.4 MB │      1 │
│   └ dependencies              │         │         │      │           │        │
│     ├ eight-colors            │ 1.0.2   │ 13.8 KB │    0 │       0 B │      0 │
│     ├ gauge                   │ 5.0.0   │ 42.1 KB │   11 │  113.1 KB │      0 │
│     └ puppeteer-core          │ 19.7.1  │ 3.82 MB │   49 │   7.45 MB │      1 │
└───────────────────────────────┴─────────┴─────────┴──────┴───────────┴────────┘
```
## CHANGELOG 
[CHANGELOG.md](CHANGELOG.md)