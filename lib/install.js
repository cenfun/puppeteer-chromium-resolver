const EC = require('eight-colors');
const PCR = require('./index.js');
const { PUPPETEER_SKIP_DOWNLOAD } = process.env;
// skip download when install
if (PUPPETEER_SKIP_DOWNLOAD) {
    EC.logYellow('[PCR] PUPPETEER_SKIP_DOWNLOAD');
} else {
    PCR();
}
