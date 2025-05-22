import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import * as EC from 'eight-colors';
import puppeteer, { PuppeteerNode, LaunchOptions } from 'puppeteer-core'; // Import PuppeteerNode and LaunchOptions for type
import * as PB from '@puppeteer/browsers'; // For PB.BrowserPlatform and PB.InstalledBrowser

import Util from './util';
import defaultPcrOptions, { PcrDefaultOptions } from './options';
import detectLocalChromium from './detect'; // Default export from detect.ts
import downloadChromium from './download'; // Default export from download.ts

// Main options interface, extending defaults and adding resolved/dynamic properties
export interface PcrOptions extends PcrDefaultOptions {
  // Properties resolved or added during the process
  puppeteerVersion?: string;
  platform: PB.BrowserPlatform; // Becomes non-optional after resolution
  revision: string; // Becomes non-optional after resolution
  executablePath?: string;
  chromiumVersion?: string;
  launchable?: boolean;
  cacheDir: string; // Becomes non-optional after resolution
  snapshotsDir: string; // Becomes non-optional after resolution
  installedBrowser?: PB.InstalledBrowser;
  retryNum?: number; // Added by download handler
  hosts: string[]; // Becomes non-optional after resolution
}

// Interface for the stats object returned
export interface StatsInfo {
  puppeteerVersion?: string;
  platform: PB.BrowserPlatform;
  revision: string;
  cacheDir: string;
  snapshotsDir: string;
  executablePath?: string;
  chromiumVersion?: string;
  launchable?: boolean;
  puppeteer: PuppeteerNode; // The actual puppeteer-core module instance
}

const getHostsList = (options: Partial<PcrOptions>): string[] => {
  let hosts = options.hosts;
  if (!Util.isList(hosts) || hosts.length === 0) {
    const defaultHost =
      process.env.PUPPETEER_DEFAULT_HOST || 'https://storage.googleapis.com';
    hosts = [defaultHost];
  }
  return hosts;
};

const resolveCacheDir = (options: Partial<PcrOptions>): string => {
  const downloadPath = options.downloadPath;
  if (!downloadPath) {
    return os.homedir(); // Default to home directory if no downloadPath
  }
  const cacheDir = path.resolve(downloadPath);
  if (!fs.existsSync(cacheDir)) {
    try {
      fs.mkdirSync(cacheDir, { recursive: true });
    } catch (e: any) {
      Util.output(
        `Failed to create download dir: ${Util.formatPath(cacheDir)} - ${
          e.message
        }`,
        true
      );
    }
  }
  return cacheDir;
};

const resolveSnapshotsDir = (
  options: Pick<PcrOptions, 'cacheDir' | 'folderName'>
): string => {
  const folderName = options.folderName || '.chromium-browser-snapshots'; // Fallback just in case
  const snapshotsDir = path.resolve(options.cacheDir, folderName);
  if (!fs.existsSync(snapshotsDir)) {
    try {
      fs.mkdirSync(snapshotsDir, { recursive: true });
    } catch (e: any) {
      Util.output(
        `Failed to create snapshots dir: ${Util.formatPath(snapshotsDir)} - ${
          e.message
        }`,
        true
      );
    }
  }
  return snapshotsDir;
};

const getOptionsFromPackage = (): Partial<PcrDefaultOptions> | undefined => {
  let pkgConfig;
  try {
    // Dynamically require package.json at runtime
    pkgConfig = require(path.resolve(process.cwd(), 'package.json'));
  } catch (e) {
    // No package.json or error reading it
    return undefined;
  }
  if (pkgConfig && pkgConfig.pcr && typeof pkgConfig.pcr === 'object') {
    return pkgConfig.pcr as Partial<PcrDefaultOptions>;
  }
  return undefined;
};

export const getResolvedOptions = (
  initialOptions: Partial<PcrOptions> = {}
): PcrOptions => {
  const optionsFromPackage = getOptionsFromPackage();
  // Start with defaultPcrOptions, merge package options, then merge initialOptions
  const mergedOptions: PcrOptions = {
    ...defaultPcrOptions,
    ...optionsFromPackage,
    ...initialOptions,
    // These will be definitely set below, so assert types here or fill them
    platform: initialOptions.platform || Util.detectBrowserPlatform()!, // platform will be set
    revision: initialOptions.revision || '', // revision will be set
    cacheDir: initialOptions.cacheDir || '', // cacheDir will be set
    snapshotsDir: initialOptions.snapshotsDir || '', // snapshotsDir will be set
    hosts: initialOptions.hosts || [], // hosts will be set
  };

  mergedOptions.hosts = getHostsList(mergedOptions);
  mergedOptions.cacheDir = resolveCacheDir(mergedOptions);
  mergedOptions.snapshotsDir = resolveSnapshotsDir(mergedOptions);
  // platform and revision are resolved later in the main PCR flow

  return mergedOptions;
};

const launchHandler = async (options: PcrOptions): Promise<void> => {
  options.launchable = false; // Reset before trying
  if (!options.executablePath) {
    Util.output('No executable path provided for launch test.', true);
    return;
  }
  try {
    const browser = await puppeteer.launch({
      headless: 'new' as any, // Cast 'new' to any to satisfy type-checker
      args: ['--no-sandbox'], // Common for CI/server environments
      executablePath: options.executablePath,
    } as LaunchOptions); // Cast the whole options object if needed, or just the property
    options.launchable = true;
    options.chromiumVersion = await browser.version();
    await browser.close();
    await Util.delay(500); // Original delay
  } catch (error: any) {
    Util.output(`Launch test failed: ${error.message || String(error)}`, true);
    // console.log(error); // Original console.log
  }
};

const getCurrentPuppeteerVersion = (): string | undefined => {
  const version = Util.getPuppeteerVersion();
  if (!version) {
    Util.output('Failed to get Puppeteer version.', true);
    return undefined;
  }
  Util.output(`Puppeteer version: ${EC.magenta(version)}`);
  return version;
};

const getCurrentBrowserPlatform = (): PB.BrowserPlatform | undefined => {
  const platform = Util.detectBrowserPlatform();
  if (!platform) {
    Util.output('Failed to detect browser platform.', true);
    return undefined;
  }
  Util.output(`Browser platform: ${EC.magenta(platform)}`);
  return platform;
};

const resolveChromiumRevision = async (
  options: PcrOptions
): Promise<string> => {
  let revision = options.revision || process.env.PUPPETEER_REVISION;
  if (!revision) {
    if (!options.platform) {
      Util.output('Cannot resolve revision without platform.', true);
      // Consider throwing an error or returning a specific marker
      return ''; // Or a default/fallback revision if appropriate
    }
    revision = await Util.resolveBuildId(options.platform);
  }
  Util.output(`Chromium revision: ${EC.magenta(revision)}`);
  return revision;
};

const generateStatsInfo = (options: PcrOptions): StatsInfo => {
  const stats: StatsInfo = {
    puppeteerVersion: options.puppeteerVersion,
    platform: options.platform!, // platform should be set by now
    revision: options.revision!, // revision should be set by now
    cacheDir: Util.formatPath(options.cacheDir)!,
    snapshotsDir: Util.formatPath(options.snapshotsDir)!,
    puppeteer: puppeteer, // Attach the puppeteer module instance
  };

  if (options.executablePath) {
    const formattedPath = Util.formatPath(options.executablePath)!;
    stats.executablePath = formattedPath;
    const exists = fs.existsSync(formattedPath);
    Util.output(
      `Chromium executablePath: ${
        exists ? EC.green(formattedPath) : EC.red(formattedPath)
      }`
    );
  }

  if (options.chromiumVersion) {
    stats.chromiumVersion = options.chromiumVersion;
    Util.output(`Chromium version: ${EC.magenta(options.chromiumVersion)}`);
  }

  if (typeof options.launchable === 'boolean') {
    stats.launchable = options.launchable;
    Util.output(
      `Chromium launchable: ${
        options.launchable ? EC.green('true') : EC.red('false')
      }`
    );
  }

  // Save before returning (excluding the 'puppeteer' instance from JSON)
  const { puppeteer: _, ...savableStats } = stats;
  saveStatsToFile(options, savableStats);

  return stats;
};

const getStatsPath = (
  options: Partial<Pick<PcrOptions, 'cacheDir' | 'statsName'>> = {}
): string => {
  const statsDir = options.cacheDir || os.homedir();
  const statsName = options.statsName || defaultPcrOptions.statsName;
  return path.resolve(statsDir, statsName);
};

const saveStatsToFile = (
  options: PcrOptions,
  statsData: Omit<StatsInfo, 'puppeteer'>
): void => {
  const statsPath = getStatsPath(options);
  try {
    fs.writeFileSync(statsPath, JSON.stringify(statsData, null, 4));
    Util.output(`Stats saved: ${Util.formatPath(statsPath)}`);
  } catch (e: any) {
    Util.output(
      `Failed to save stats: ${Util.formatPath(statsPath)} - ${e.message}`,
      true
    );
  }
};

export const getStatsFromFile = (
  optionsInput?: Partial<PcrOptions>
): StatsInfo | undefined => {
  // Ensure options used for getStatsPath are resolved enough to have cacheDir and statsName
  const optsForPath = optionsInput
    ? { cacheDir: optionsInput.cacheDir, statsName: optionsInput.statsName }
    : {};
  const statsPath = getStatsPath(optsForPath);
  try {
    const fileContent = fs.readFileSync(statsPath, 'utf-8');
    const statsFromFile = JSON.parse(fileContent) as Omit<
      StatsInfo,
      'puppeteer'
    >;
    return {
      ...statsFromFile,
      puppeteer: puppeteer, // Re-attach puppeteer module instance
    };
  } catch (e) {
    Util.output(
      'Not found PCR stats cache or error reading it. Try npm install again.',
      true
    );
    return undefined;
  }
};

const PCR = async (
  initialOptions?: Partial<PcrOptions>
): Promise<StatsInfo | undefined> => {
  const options = getResolvedOptions(initialOptions);

  Util.silent = true; // Check cache silently first
  const cachedStats = getStatsFromFile(options);
  if (
    cachedStats &&
    cachedStats.executablePath &&
    fs.existsSync(cachedStats.executablePath)
  ) {
    // If a specific revision is requested, ensure cache matches
    if (
      !options.revision ||
      (options.revision && options.revision === cachedStats.revision)
    ) {
      Util.silent = options.silent; // Restore user's silent setting
      Util.output('Using cached Chromium information.');
      // Update output with cached info if not silent
      if (!options.silent) {
        generateStatsInfo({
          ...options,
          ...cachedStats,
          puppeteerVersion:
            cachedStats.puppeteerVersion || getCurrentPuppeteerVersion(),
        }); // Re-log with current settings
      }
      return cachedStats;
    }
  }
  Util.silent = options.silent; // Restore user's silent setting for subsequent operations

  options.puppeteerVersion = getCurrentPuppeteerVersion();
  const platform = getCurrentBrowserPlatform();
  if (!platform) {
    Util.output('Could not determine platform. Aborting.', true);
    return undefined; // Cannot proceed without a platform
  }
  options.platform = platform;
  options.revision = await resolveChromiumRevision(options);
  if (!options.revision) {
    Util.output('Could not determine revision. Aborting.', true);
    return undefined; // Cannot proceed without a revision
  }

  // At this point, options.platform and options.revision are definitely set.
  // And options.snapshotsDir is also set via getResolvedOptions.

  const localChromiumFound = detectLocalChromium(options); // detectLocalChromium mutates options.executablePath

  if (!localChromiumFound) {
    Util.output('Local Chromium not found. Attempting download...');
    // downloadChromium expects platform, revision, snapshotsDir, hosts, retry
    await downloadChromium(options); // downloadChromium mutates options.installedBrowser and options.executablePath
  }

  // If executablePath is found (either detected or downloaded), try to launch
  if (options.executablePath) {
    await launchHandler(options); // mutates options.launchable and options.chromiumVersion
  } else {
    Util.output(
      'No executable path found after detection and download attempts.',
      true
    );
    options.launchable = false;
  }

  Util.closeGauge(); // Ensure gauge is closed

  const finalStats = generateStatsInfo(options);
  return finalStats;
};

// Attach methods to PCR function object to mimic original API
(PCR as any).getOptions = getResolvedOptions;
(PCR as any).getStats = (
  options?: Partial<PcrOptions>
): StatsInfo | undefined => {
  const resolvedOpts = getResolvedOptions(options);
  return getStatsFromFile(resolvedOpts);
};

export default PCR;
