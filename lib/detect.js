const fs = require('fs');
const path = require('path');
const EC = require('eight-colors');
const Util = require('./util.js');

const getDetectionPath = (options) => {
    let detectionPath = options.detectionPath;
    if (Array.isArray(detectionPath)) {
        return detectionPath;
    }
    detectionPath = `${detectionPath}`;
    if (detectionPath) {
        return detectionPath.split(',');
    }
    return [];
};


const getDetectionList = (options) => {
    // from user custom
    const detectionList = getDetectionPath(options);

    // from chromium snapshots dir
    detectionList.push(options.snapshotsDir);

    // from current folder and up 5 level folder
    const maxLevel = 5;
    let level = 0;
    let current = process.cwd();
    while (current && level < maxLevel) {
        const dir = path.resolve(current, options.folderName);
        detectionList.push(dir);
        const parent = path.resolve(current, '../');
        if (parent === current) {
            current = '';
        } else {
            current = parent;
        }
        level += 1;
    }

    // all detection list
    return detectionList;
};

const detectionPathHandler = async (options, detectionPath) => {
    detectionPath = path.resolve(detectionPath);

    const revision = options.revision;

    const executablePath = await Util.computeExecutablePath({
        buildId: revision,
        cacheDir: detectionPath
    });

    if (!executablePath) {
        return;
    }

    if (!fs.existsSync(executablePath)) {
        return;
    }

    return executablePath;

};

const detectionHandler = async (options) => {

    const detectionList = getDetectionList(options);
    // console.log(detectionList);

    for (const detectionPath of detectionList) {
        const executablePath = await detectionPathHandler(options, detectionPath);
        if (executablePath) {
            return executablePath;
        }
    }
    return null;
};

// =========================================================================================

module.exports = async (options) => {
    const executablePath = await detectionHandler(options);
    if (executablePath) {
        options.executablePath = executablePath;
        Util.output(`Found local chromium: ${EC.green(options.revision)}`);
        return true;
    }
    Util.output(EC.yellow('Not found local chromium'));
    return false;
};
