const path = require('path');

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
    // from user folder
    detectionList.push(options.userFolder);
    // from current folder and up 5 level folder
    const folderName = options.folderName;
    const maxLevel = 5;
    let level = 0;
    let current = process.cwd();
    while (current && level < maxLevel) {
        detectionList.push(path.resolve(current, folderName));
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
    const browserFetcher = options.createBrowserFetcher({
        path: detectionPath
    });
    const revisionInfo = browserFetcher.revisionInfo(options.revision);
    return revisionInfo;
};

const detectionHandler = (options) => {
    for (const detectionPath of options.detectionList) {
        const revisionInfo = detectionPathHandler(options, detectionPath);
        if (detectionPath === options.userFolder) {
            options.userRevisionInfo = revisionInfo;
        }
        if (revisionInfo.local) {
            return revisionInfo;
        }
    }
    return null;
};


// =========================================================================================

module.exports = (options) => {
    options.detectionList = getDetectionList(options);
    // output(detectionList.join("\n"));
    const revisionInfo = detectionHandler(options);
    if (revisionInfo) {
        options.revisionInfo = revisionInfo;
        options.output('Detected local chromium is already downloaded');
        return true;
    }
    options.output('Not found local chromium');
    return false;
};
