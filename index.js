const Resolver = require("./resolver");
const originalPuppeteer = require('puppeteer-core');

// We extend the original puppeteer object.
// We don't want to modify the original, since resolver.js relies on it.
const puppeteer = Object.create(originalPuppeteer);

// Allow calling code to access the resolver if they need to.
puppeteer.PCR = Resolver;

// Allow calling code to set options if they need to.
let pcrOptions = {};
puppeteer.setPcrOptions = (options) => {
  pcrOptions = options;
}

/**
 * Get a function which is the original function, but with the executablePath
 * property always set in the first argument.
 *
 * @param {Function} originalFunc
 *   The function to override
 * @returns {Function}
 *   The modified function.
 */
function injectExecutablePath(originalFunc) {
  return async function() {
    const pcr = await Resolver(pcrOptions);
    if (!arguments[0].executablePath) {
      arguments[0].executablePath = pcr.executablePath;
    }
    return originalFunc.apply(this, arguments);
  }
}

// Make sure that the launch and connect functions always use the executablePath
// from our module if not set upstream.
puppeteer.launch = injectExecutablePath(originalPuppeteer.launch);
puppeteer.connect = injectExecutablePath(originalPuppeteer.connect);

// Use the puppeteer object directly, so that our module can serve as a drop-in
// replacement for puppeteer.
module.exports = puppeteer;
