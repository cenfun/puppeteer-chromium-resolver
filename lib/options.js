module.exports = {
// the chromium revision to use
    // default is puppeteer.PUPPETEER_REVISIONS.chromium
    revision: '',

    // additional path to detect local chromium copy (separate with a comma if multiple paths)
    detectionPath: '',

    // customize path to download chromium to local
    // default is user home dir
    downloadPath: '',

    // the folder of chromium snapshots
    folderName: '.chromium-browser-snapshots',

    // the stats file name
    statsName: '.pcr-stats.json',

    // default hosts are ['https://storage.googleapis.com', 'https://npm.taobao.org/mirrors']
    hosts: [],

    cacheRevisions: 2,
    retry: 3,
    silent: false
};
