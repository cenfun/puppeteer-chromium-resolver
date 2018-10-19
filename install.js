require("./index.js")({}).then(function (revisionInfo) {
    console.log("Chromium revision installed and launchable is " + revisionInfo.launchable);
    process.exit(0);
});