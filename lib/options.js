module.exports = {
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

    // default hosts are ['https://storage.googleapis.com']
    hosts: [],

    cacheRevisions: 2,
    retry: 3,
    silent: false
};
