
# Puppeteer Chromium Resolver
> Tool to resolve puppeteer and chromium faster, detect local installed chromium, download chromium with custom mirror host, cache chromium revision out of node_modules, test chromium headless being launchable.

![npm](https://img.shields.io/npm/v/puppeteer-chromium-resolver.svg)
![npm](https://img.shields.io/npm/dt/puppeteer-chromium-resolver.svg)
![David](https://img.shields.io/david/cenfun/puppeteer-chromium-resolver.svg)

* Tool to customize [puppeteer](https://github.com/GoogleChrome/puppeteer)
* Detect local chromium automatically
* Download chromium from custom mirror host
* Cache chromium to local folder
* Try launching chromium and resolve launchable and version
* Resolve chromium executablePath and puppeteer


## Install 
```sh
npm install puppeteer-chromium-resolver --save
```
## Usage
```js
const PCR = require("puppeteer-chromium-resolver");
const pcr = await PCR();
const browser = await pcr.puppeteer.launch({
    headless: true,
    args: ['--no-sandbox'],
    executablePath: pcr.executablePath
}).catch(function (error) {
    console.log(error);
});
const page = await browser.newPage();
await page.goto('https://www.google.com');
await browser.close();
```

## Option
```js
const pcr = await PCR({
    revision: "",
    detectionPath: "",
    folderName: '.chromium-browser-snapshots',
    hosts: ["https://storage.googleapis.com", "https://npm.taobao.org/mirrors"],
    cacheRevisions: 2,
    retry: 3,
    silent: false
});
```

## Properties
|Property        | Type    |                          |
| :--------------| :------ | :----------------------  |
|revision        | String  |current chromium revision |
|executablePath  | String  |chromium executable path  |
|folderPath      | String  |chromium folder path      |
|local           | Boolean |exists local chromium     |
|url             | String  |chromium download url     |
|launchable      | Boolean |chromium launchable       |
|chromiumVersion | String  |chromium version          |
|puppeteer       | Object  |puppeteer module          |
|puppeteerVersion| String  |puppeteer version         |


## How to replace puppeteer with puppeteer-chromium-resolver
* add config "puppeteer_skip_download = true" to .npmrc
* set env PUPPETEER_EXECUTABLE_PATH to PCR executablePath
```js
const PCR = require("puppeteer-chromium-resolver");
const puppeteer = require("puppeteer");
const main = async()=>{
    const pcr = await PCR();
    process.env.PUPPETEER_EXECUTABLE_PATH = pcr.executablePath
    const browser = await puppeteer.launch({
        headless: false
    });
    const page = await browser.newPage();
    await page.goto('https://github.com');
    await browser.close();
}
main();
```


## CHANGELOG

+ v4.0.0
  - updated puppeteer-core to v4

+ v3.2.0
  - updated puppeteer-core to v3

+ v3.1.0
  - updated puppeteer-core version to 2.1.1
  - auto detect host response time and download from quicker one

+ v3.0.1
+ v2.0.2
  - added option cacheRevisions to cache multiple revisions

+ v3.0.0
  - updated puppeteer-core version to v2.0.0

+ v2.0.1
  - updated puppeteer-core version to v1.19.0
  - refactoring with async/await
  - fixed requesting timeout

+ v1.0.12
  - updated puppeteer-core version to v1.18.1
  - fixed a gauge log issue