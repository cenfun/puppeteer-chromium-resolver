const EventEmitter = require('events');
const path = require('path');
const fs = require('fs');
const os = require('os');
const puppeteer = require('puppeteer-core');

const Gauge = require('gauge');
const gauge = new Gauge();

function output() {
    gauge.disable();
    console.log.apply(console, arguments);
    gauge.enable();
}


class Resolver extends EventEmitter {
    constructor(option) {
        super();
        this.option = Object.assign(this.defaultOption(), option);
    }

    defaultOption() {
        return {
            revision: "",
            detectionPath: "",
            folderName: '.chromium-browser-snapshots',
            hosts: ["https://storage.googleapis.com", "https://npm.taobao.org/mirrors"],
            retry: 3
        };
    }

    async start() {

        this.revision = this.getRevision();
        output("Resolve chromium revision: " + this.revision);

        this.userFolder = this.getUserFolder();

        this.detectionList = this.getDetectionList();
        output("Detecting local chromium ...");
        //output(this.detectionList.join("\n"));

        var revisionInfo = await this.detectionHandler();
        if (revisionInfo) {
            this.revisionInfo = revisionInfo;
            this.launchHandler();
            return;
        }

        //Not found, try to download to user folder
        this.revisionInfo = this.userRevisionInfo;
        this.index = 0;
        this.retry = 0;
        this.download();
    }

    async detectionPathHandler(detectionPath) {
        detectionPath = path.resolve(detectionPath);
        let browserFetcher = puppeteer.createBrowserFetcher({
            path: detectionPath
        });
        let revisionInfo = browserFetcher.revisionInfo(this.revision);
        return revisionInfo;
    }

    async detectionHandler() {
        for (let detectionPath of this.detectionList) {
            let revisionInfo = await this.detectionPathHandler(detectionPath);
            if (detectionPath === this.userFolder) {
                this.userRevisionInfo = revisionInfo;
            }
            if (revisionInfo.local) {
                output("Detected chromium revision is already downloaded.");
                return revisionInfo;
            }
        }
        return null;
    }

    download() {

        var host = this.option.hosts[this.index];
        if (!host) {
            this.next();
            return;
        }

        var mirror = this.index === 0 ? "host" : "mirror host";

        output("Download from " + mirror + ": " + host + " ...");

        const browserFetcher = puppeteer.createBrowserFetcher({
            host: host,
            path: this.userFolder
        });

        var self = this;
        browserFetcher.download(this.revision, onProgress)
            .then(() => browserFetcher.localRevisions())
            .then((localRevisions) => {
                output('Chromium downloaded to ' + self.userFolder);
                localRevisions = localRevisions.filter(revision => revision !== self.revision);
                // Remove previous chromium revisions.
                const cleanupOldVersions = localRevisions.map(revision => browserFetcher.remove(revision));
                return Promise.all([...cleanupOldVersions]);
            })
            .then(() => {
                self.launchHandler();
            })
            .catch((error) => {
                console.error(`ERROR: Failed to download Chromium r${self.revision}. retry ...`);
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
            output('Retry Chromium downloading ... ');
        }

        this.download();
    }

    async launchHandler() {
        this.launchable = false;

        var browser = await puppeteer.launch({
            //fix root issue
            args: ['--no-sandbox'],
            executablePath: this.revisionInfo.executablePath
        }).catch(function (error) {
            output(error);
        });

        if (browser) {
            this.launchable = true;
            browser.close();
        }

        this.resolveHandler();
    }

    resolveHandler() {

        this.revisionInfo.launchable = this.launchable;
        this.revisionInfo.puppeteer = puppeteer;
        this.revisionInfo.puppeteerVersion = this.getPuppeteerVersion();

        output(`chromium executablePath: ${this.revisionInfo.executablePath}`);
        output(`chromium launchable: ${this.revisionInfo.launchable}`);
        output(`puppeteer version: ${this.revisionInfo.puppeteerVersion}`);

        //close gauge
        gauge.disable();

        this.emit("resolve", this.revisionInfo);

    }

    getUserFolder() {

        var homePath = os.homedir();
        var userFolder = path.resolve(homePath, this.option.folderName);
        if (fs.existsSync(userFolder)) {
            return userFolder;
        }

        try {
            fs.mkdirSync(userFolder, '0777');
            // Make double sure we have 0777 permissions; some operating systems
            // default umask does not allow write by default.
            fs.chmodSync(userFolder, '0777');
        } catch (e) {
            output("User path is not writable: " + userFolder);
            output(e);
        }

        return userFolder;
    }

    getRevision() {

        if (this.option.revision) {
            return this.option.revision;
        }

        var conf = this.getPuppeteerConf();
        if (conf) {
            return conf.puppeteer.chromium_revision;
        }

        return require("./package.json").puppeteer.chromium_revision;

    }

    getPuppeteerVersion() {
        var conf = this.getPuppeteerConf();
        if (conf) {
            return conf.version;
        }
        return "";
    }

    getPuppeteerConf() {

        if (this.puppeteerConf) {
            return this.puppeteerConf;
        }

        var p1 = path.resolve(__dirname, "../puppeteer-core/package.json");
        if (fs.existsSync(p1)) {
            this.puppeteerConf = require(p1);
            return this.puppeteerConf;
        }

        var p2 = path.resolve(__dirname, "./node_modules/puppeteer-core/package.json");
        if (fs.existsSync(p2)) {
            this.puppeteerConf = require(p2);
            return this.puppeteerConf;
        }

        return null;
    }

    getDetectionPath() {
        var detectionPath = this.option.detectionPath;
        if (Array.isArray(detectionPath)) {
            return detectionPath;
        }
        detectionPath = detectionPath + "";
        if (detectionPath) {
            return detectionPath.split(",");
        }
        return [];
    }

    getDetectionList() {

        var detectionList = this.getDetectionPath();
        detectionList.push(this.userFolder);

        var folderName = this.option.folderName;

        var level = 0;
        var maxLevel = 5;
        var current = process.cwd();
        while (current && level < maxLevel) {
            detectionList.push(path.resolve(current, folderName));
            var parent = path.resolve(current, "../");
            if (parent === current) {
                current = "";
            } else {
                current = parent;
            }
            level += 1;
        }

        return detectionList;

    }


}

function onProgress(downloadedBytes, totalBytes) {
    var per = 0;
    if (totalBytes) {
        per = downloadedBytes / totalBytes;
    }
    gauge.show(`Downloading Chromium - ${toMegabytes(downloadedBytes)} / ${toMegabytes(totalBytes)}`, per);
}

function toMegabytes(bytes) {
    const mb = bytes / 1024 / 1024;
    return `${Math.round(mb * 10) / 10} Mb`;
}


module.exports = function (option) {
    option = option || {};

    return new Promise((resolve) => {

        var resolver = new Resolver(option);
        resolver.on("resolve", (revisionInfo) => {
            resolve(revisionInfo);
        });
        resolver.start();

    });

};