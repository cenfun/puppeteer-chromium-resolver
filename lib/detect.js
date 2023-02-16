const path = require('path');
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

const detectionPathHandler = (options, detectionPath) => {
    detectionPath = path.resolve(detectionPath);
    const browserFetcher = Util.createBrowserFetcher({
        path: detectionPath
    });
    const revisionInfo = browserFetcher.revisionInfo(options.revision);
    return revisionInfo;
};

const detectionHandler = (options) => {

    const detectionList = getDetectionList(options);
    // console.log(detectionList);

    for (const detectionPath of detectionList) {
        const revisionInfo = detectionPathHandler(options, detectionPath);
        if (revisionInfo.local) {
            return revisionInfo;
        }
    }
    return null;
};

// =========================================================================================

module.exports = (options) => {
    const revisionInfo = detectionHandler(options);
    if (revisionInfo) {
        options.revisionInfo = revisionInfo;
        Util.output('Detected local chromium is already downloaded');
        return true;
    }
    Util.output('Not found local chromium');
    return false;
};
