const EventEmitter = require('events');
const path = require('path');
const fs = require('fs');
const os = require('os');
const puppeteer = require('puppeteer-core');

class Resolver extends EventEmitter {
    constructor(option) {
        super();
        this.option = Object.assign(this.defaultOption(), option);
    }

    defaultOption() {
        return {
            hosts: ["https://storage.googleapis.com", "https://npm.taobao.org/mirrors"],
            revision: this.getRevision(),
            savePath: this.getSaveFolder(),
            retry: 3
        };
    }

    start() {

        this.index = 0;
        this.retry = 0;
        this.savePath = path.resolve(this.option.savePath);

        const browserFetcher = puppeteer.createBrowserFetcher({
            path: this.savePath
        });

        this.revisionInfo = browserFetcher.revisionInfo(this.option.revision);

        if (this.revisionInfo.local) {
            console.log("Chromium revision is already downloaded:");
            console.log(this.revisionInfo.folderPath);
            this.launchHandler();
            return;
        }

        this.download();
    }

    download() {

        var host = this.option.hosts[this.index];
        if (!host) {
            this.next();
            return;
        }

        var mirror = this.index === 0 ? "host" : "mirror host";

        console.log("Download from " + mirror + ": " + host + " ...");

        const browserFetcher = puppeteer.createBrowserFetcher({
            host: host,
            path: this.savePath
        });

        var self = this;
        browserFetcher.download(this.revisionInfo.revision, onProgress)
            .then(() => browserFetcher.localRevisions())
            .then((localRevisions) => {
                console.log('Chromium downloaded to ' + self.revisionInfo.folderPath);
                localRevisions = localRevisions.filter(revision => revision !== self.revisionInfo.revision);
                // Remove previous chromium revisions.
                const cleanupOldVersions = localRevisions.map(revision => browserFetcher.remove(revision));
                return Promise.all([...cleanupOldVersions]);
            })
            .then(() => {
                self.launchHandler();
            })
            .catch((error) => {
                console.error(`ERROR: Failed to download Chromium r${this.option.revision}. retry ...`);
                console.error(error);
                self.next();
            });

    }

    next() {
        setTimeout((self) => {
            self.nextNow();
        }, 1000, this);
    }

    nextNow() {

        this.index += 1;

        if (this.index >= this.option.hosts.length) {
            this.index = 0;
            this.retry += 1;
            if (this.retry >= this.option.retry) {
                console.error(`ERROR: Failed to download Chromium after retry ${this.retry} times. `);
                process.exit(1);
                return;
            }
            console.log('Retry download Chromium ... ');
        }

        this.download();
    }

    launchHandler() {
        this.launchable = false;

        var self = this;
        puppeteer.launch({
            //fix root issue
            args: ['--no-sandbox'],
            executablePath: this.revisionInfo.executablePath
        }).then(function (browser) {
            if (browser) {
                self.launchable = true;
                browser.close();
            }
            self.finishHandler();
        }, function (e) {
            console.log(e);
            self.finishHandler();
        });
    }

    finishHandler() {

        this.revisionInfo.launchable = this.launchable;
        this.revisionInfo.puppeteer = puppeteer;

        console.log("==================================================");
        console.log("Chromium revision info:");
        for (let k in this.revisionInfo) {
            console.log("  " + k + ": " + this.revisionInfo[k]);
        }
        console.log("==================================================");

        this.emit("finish", this.revisionInfo);

    }

    getSaveFolder() {

        var homePath = os.homedir();
        var savePath = path.resolve(homePath, '.chromium-browser-snapshots');
        if (fs.existsSync(savePath)) {
            return savePath;
        }

        try {
            fs.mkdirSync(savePath, '0777');
            // Make double sure we have 0777 permissions; some operating systems
            // default umask does not allow write by default.
            fs.chmodSync(savePath, '0777');
            return savePath;
        } catch (e) {
            console.log("Path is not writable: " + savePath);
            console.log(e);
        }

    }

    getRevision() {

        var p1 = path.resolve(__dirname, "../puppeteer-core/package.json");
        if (fs.existsSync(p1)) {
            return require(p1).puppeteer.chromium_revision;
        }

        var p2 = path.resolve(__dirname, "./node_modules/puppeteer-core/package.json");
        if (fs.existsSync(p2)) {
            return require(p2).puppeteer.chromium_revision;
        }

        return require("./package.json").puppeteer.chromium_revision;

    }


}


let progressBar = null;
let lastDownloadedBytes = 0;

function onProgress(downloadedBytes, totalBytes) {
    if (!progressBar) {
        const ProgressBar = require('progress');
        progressBar = new ProgressBar(`Downloading Chromium - ${toMegabytes(totalBytes)} [:bar] :percent :etas `, {
            complete: '=',
            incomplete: ' ',
            width: 20,
            total: totalBytes,
        });
    }
    const delta = downloadedBytes - lastDownloadedBytes;
    lastDownloadedBytes = downloadedBytes;
    progressBar.tick(delta);
}

function toMegabytes(bytes) {
    const mb = bytes / 1024 / 1024;
    return `${Math.round(mb * 10) / 10} Mb`;
}


module.exports = function (option) {
    option = option || {};

    return new Promise((resolve, reject) => {

        var resolver = new Resolver(option);
        resolver.on("finish", (revisionInfo) => {
            resolve(revisionInfo);
        });
        resolver.start();

    });

};