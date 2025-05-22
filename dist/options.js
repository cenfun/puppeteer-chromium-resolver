"use strict";
// Defines the default options for Puppeteer Chromium Resolver (PCR)
Object.defineProperty(exports, "__esModule", { value: true });
const defaultOptions = {
    revision: '',
    detectionPath: '', // Can be a comma-separated string or an array later
    downloadPath: '',
    folderName: '.chromium-browser-snapshots',
    statsName: '.pcr-stats.json',
    hosts: [], // Will be populated with default if empty
    cacheRevisions: 2,
    retry: 3,
    silent: false,
};
exports.default = defaultOptions;
//# sourceMappingURL=options.js.map