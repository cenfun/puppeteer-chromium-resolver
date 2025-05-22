# Puppeteer Chromium Resolver

> Tool to resolve puppeteer and chromium faster, detect local installed chromium, download chromium with custom mirror host, cache chromium revision out of node_modules, test chromium headless being launchable. Now written in TypeScript!

![](https://img.shields.io/npm/v/puppeteer-chromium-resolver)
![](https://img.shields.io/librariesio/github/cenfun/puppeteer-chromium-resolver)
![](https://img.shields.io/librariesio/dependents/npm/puppeteer-chromium-resolver)
[![](https://badgen.net/npm/dw/puppeteer-chromium-resolver)](https://www.npmjs.com/package/puppeteer-chromium-resolver)
![](https://img.shields.io/github/license/cenfun/puppeteer-chromium-resolver)

- Tool to customize [puppeteer](https://github.com/GoogleChrome/puppeteer)
- Detect local chromium automatically
- Download chromium from custom mirror host
- Cache chromium to custom local folder
- Try launching chromium and resolve launchable and version
- Resolve chromium executablePath and puppeteer

## Install

```sh
npm i puppeteer-chromium-resolver
```

## Usage

### [Async] dynamic detection and downloading chromium

```typescript
import PCR from 'puppeteer-chromium-resolver';
// or for CommonJS: const PCR = require("puppeteer-chromium-resolver").default;

(async () => {
  const options = {}; // Optional: specify PCR options
  const stats = await PCR(options);
  if (!stats || !stats.executablePath) {
    console.error('Failed to resolve Chromium.');
    return;
  }
  const browser = await stats.puppeteer
    .launch({
      headless: 'new', // Modern headless mode
      args: ['--no-sandbox'],
      executablePath: stats.executablePath,
    })
    .catch(function (error) {
      console.log(error);
    });

  if (!browser) {
    console.error('Failed to launch browser.');
    return;
  }

  const page = await browser.newPage();
  await page.goto('https://www.npmjs.com/package/puppeteer-chromium-resolver');
  await browser.close();
})();
```

### [Sync-like] Get stats from cache (Chromium should be pre-downloaded or resolved)

The `install` script of this package (run via `npm install puppeteer-chromium-resolver`) attempts to resolve and download Chromium.
After installation, you can try to get the stats:

```typescript
import PCR from 'puppeteer-chromium-resolver';
// or for CommonJS: const PCR = require("puppeteer-chromium-resolver");
// Note: PCR.getStats is attached to the default export.

const options = {}; // Optional: specify PCR options
const stats = PCR.getStats(options); // PCR.getStats is a helper on the main function

if (stats && stats.executablePath) {
  stats.puppeteer
    .launch({
      headless: 'new',
      args: ['--no-sandbox'],
      executablePath: stats.executablePath,
    })
    .then(async (browser) => {
      if (browser) {
        //...
        await browser.close();
      }
    })
    .catch(function (error) {
      console.log(error);
    });
} else {
  console.log(
    'Chromium stats not found or executable path missing. Try running `await PCR()` first or check installation.'
  );
}
```

## Default Options

```typescript
const defaultOptions = {
  // The chromium revision to use.
  // Default is an empty string (PCR will resolve it, often based on Puppeteer's preferred revision).
  // Can also be set via the PUPPETEER_REVISION environment variable.
  revision: '',

  // Additional path(s) to detect a local chromium copy.
  // Can be a single string path or multiple paths separated by a comma (or an array of strings).
  detectionPath: '',

  // Custom path to download Chromium to.
  // Default is the user's home directory.
  // Requires write permissions for the specified directory.
  downloadPath: '',

  // The folder name for storing Chromium snapshots.
  folderName: '.chromium-browser-snapshots',

  // The name of the file used to cache statistics about the last installation.
  statsName: '.pcr-stats.json',

  // Download hosts to try for fetching Chromium.
  // Defaults to ['https://storage.googleapis.com'] if empty.
  // Can be overridden by the PUPPETEER_DEFAULT_HOST environment variable.
  hosts: [],

  // Number of old revisions to keep in the cache (currently informational, not strictly enforced by PCR).
  cacheRevisions: 2,
  // Number of times to retry downloading Chromium if it fails.
  retry: 3,
  // If true, suppresses console output from PCR.
  silent: false,
};
```

See [src/options.ts](/src/options.ts) for the source.

### Option from root package.json with "pcr" object

You can also configure default options in your project's `package.json`:

```json
{
  // ...
  "pcr": {
    "revision": "1138907"
  }
}
```

## Return Stats (`StatsInfo` interface)

| Property         | Type (`@puppeteer/browsers`) | Description                                   |
| :--------------- | :--------------------------- | :-------------------------------------------- |
| revision         | `string`                     | Current Chromium revision                     |
| executablePath   | `string` (optional)          | Chromium executable path                      |
| chromiumVersion  | `string` (optional)          | Resolved Chromium version                     |
| launchable       | `boolean` (optional)         | Whether the resolved Chromium is launchable   |
| puppeteerVersion | `string` (optional)          | Detected Puppeteer version                    |
| platform         | `BrowserPlatform`            | Detected browser platform                     |
| cacheDir         | `string`                     | Resolved cache directory path                 |
| snapshotsDir     | `string`                     | Resolved snapshots directory path             |
| puppeteer        | `PuppeteerNode`              | The imported `puppeteer-core` module instance |

## Development

This project is written in TypeScript.

1.  **Install dependencies:**
    ```sh
    npm install
    ```
2.  **Build:**
    Compile TypeScript to JavaScript in the `dist` directory:
    ```sh
    npm run build
    ```
3.  **Test:**
    Run tests using Mocha and ts-node:
    ```sh
    npm test
    ```
    Test files are located in the `test` directory and are also written in TypeScript.

See [test/test.ts](/test/test.ts) for test cases.

### How to make puppeteer work with puppeteer-chromium-resolver

- 1, Sets env `PUPPETEER_SKIP_DOWNLOAD` to skip download Chromium when installation (`.npmrc` or environment):

```
PUPPETEER_SKIP_DOWNLOAD=true
```

- 2, Sets env `PUPPETEER_EXECUTABLE_PATH` to PCR executablePath globally or pass in launch option `executablePath`:

```typescript
import PCR from 'puppeteer-chromium-resolver';
import puppeteer from 'puppeteer'; // Assuming you are using full puppeteer package here

(async () => {
  const stats = await PCR({});
  if (!stats || !stats.executablePath) {
    console.error('Failed to resolve Chromium via PCR.');
    return;
  }
  // Update global env (less common for library usage, more for scripts)
  // process.env.PUPPETEER_EXECUTABLE_PATH = stats.executablePath;

  // Or specify executablePath directly (recommended)
  const browser = await puppeteer.launch({
    executablePath: stats.executablePath,
    headless: 'new',
  });
  // ... use browser
  await browser.close();
})();
```

## Troubleshooting

- CentOS: `error while loading shared libraries: libatk-1.0.so.0: cannot open shared object file: No such file or directory`

```sh
# Install dependencies:
yum install -y alsa-lib.x86_64 \
atk.x86_64 \
cups-libs.x86_64 \
gtk3.x86_64 \
ipa-gothic-fonts \
libXcomposite.x86_64 \
libXcursor.x86_64 \
libXdamage.x86_64 \
libXext.x86_64 \
libXi.x86_64 \
libXrandr.x86_64 \
libXScrnSaver.x86_64 \
libXtst.x86_64 \
pango.x86_64 \
xorg-x11-fonts-100dpi \
xorg-x11-fonts-75dpi \
xorg-x11-fonts-cyrillic \
xorg-x11-fonts-misc \
xorg-x11-fonts-Type1 \
xorg-x11-utils

# After installing dependencies you need to update nss library:
yum update nss -y
```

- Debian (e.g. Ubuntu): `error while loading shared libraries: libgobject-2.0.so.0: cannot open shared object file: No such file or directory`

```sh
sudo apt-get update && sudo apt-get install -y ca-certificates fonts-liberation libasound2 libatk-bridge2.0-0 libatk1.0-0 libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgbm1 libgcc1 libglib2.0-0 libgtk-3-0 libnspr4 libnss3 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 lsb-release wget xdg-utils
```

More [https://github.com/puppeteer/puppeteer/blob/main/docs/troubleshooting.md](https://github.com/puppeteer/puppeteer/blob/main/docs/troubleshooting.md)

## CHANGELOG

[CHANGELOG.md](CHANGELOG.md)
