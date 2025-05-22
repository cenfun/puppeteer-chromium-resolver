import * as fs from 'fs';
import * as path from 'path';
import * as EC from 'eight-colors';
import * as assert from 'assert';
import { LaunchOptions } from 'puppeteer-core';

// PCR is the default export, getOptions and getStats are attached to it.
import PCR, {
  PcrOptions,
  StatsInfo,
  getResolvedOptions,
  getStatsFromFile as getStatsViaPCR, // Keep for the one test case that uses it with no args
} from '../src/index';

// Helper function to ensure options are fully typed for cleaning utilities
const ensurePcrOptionsForClean = (options: Partial<PcrOptions>): PcrOptions => {
  return getResolvedOptions(options);
};

const cleanSnapshotsDir = (options: PcrOptions) => {
  const snapshotsDir = options.snapshotsDir;
  if (fs.existsSync(snapshotsDir)) {
    console.log(
      `${EC.cyan('[clean]')} remove chromium snapshots dir: ${EC.magenta(
        snapshotsDir
      )} ...`
    );
    try {
      fs.rmSync(snapshotsDir, { recursive: true, force: true });
    } catch (e: any) {
      console.error(
        EC.red(`[clean] Error removing snapshots dir: ${e.message}`)
      );
    }
  }
};

const cleanStatsFile = (options: PcrOptions) => {
  const statsPath = path.resolve(options.cacheDir, options.statsName);
  if (fs.existsSync(statsPath)) {
    console.log(
      `${EC.cyan('[clean]')} remove stats cache: ${EC.magenta(statsPath)} ...`
    );
    try {
      fs.rmSync(statsPath, { force: true });
    } catch (e: any) {
      console.error(EC.red(`[clean] Error removing stats file: ${e.message}`));
    }
  }
};

const cleanAll = (options: PcrOptions) => {
  cleanSnapshotsDir(options);
  cleanStatsFile(options);
};

describe('puppeteer-chromium-resolver', function () {
  this.timeout(5 * 60 * 1000);

  it('reinstall with default options', async () => {
    const initialCleanOptions = ensurePcrOptionsForClean({});
    cleanAll(initialCleanOptions);

    const options: Partial<PcrOptions> = {};
    const stats = await PCR(options);
    assert.ok(stats, 'PCR should return stats.');
    assert.ok(stats.executablePath, 'Stats should have an executablePath.');
    assert.ok(
      fs.existsSync(stats.executablePath),
      `Executable path should exist: ${stats.executablePath}`
    );
  });

  it('async PCR with default options', async () => {
    const options: Partial<PcrOptions> = {};
    const stats = await PCR(options);
    assert.ok(stats, 'PCR should return stats.');
    assert.ok(stats.executablePath, 'Stats should have an executablePath.');
    assert.ok(
      fs.existsSync(stats.executablePath),
      `Executable path should exist: ${stats.executablePath}`
    );
  });

  it('sync getStats (using imported getStatsViaPCR for default location)', () => {
    // This test specifically uses getStatsViaPCR() with no args to test reading from default path
    // Assumes a previous test like 'reinstall' has created the default stats file.
    const stats = getStatsViaPCR();
    assert.ok(stats, 'getStatsViaPCR should return stats.');
    assert.ok(stats.executablePath, 'Stats should have an executablePath.');
    assert.ok(
      fs.existsSync(stats.executablePath),
      `Executable path should exist: ${stats.executablePath}`
    );
  });

  it('async PCR without stats cache', async () => {
    const initialCleanOptions = ensurePcrOptionsForClean({});
    cleanStatsFile(initialCleanOptions); // Only clean stats, keep snapshot if it exists

    const options: Partial<PcrOptions> = {};
    const stats = await PCR(options);
    assert.ok(stats, 'PCR should return stats.');
    assert.ok(stats.executablePath, 'Stats should have an executablePath.');
    assert.ok(
      fs.existsSync(stats.executablePath),
      `Executable path should exist: ${stats.executablePath}`
    );
  });

  it('async PCR with revision: 1337728', async () => {
    const options: Partial<PcrOptions> = {
      revision: '1337728',
    };
    const stats = await PCR(options);
    assert.ok(stats, 'PCR should return stats.');
    assert.ok(stats.executablePath, 'Stats should have an executablePath.');
    assert.strictEqual(stats.revision, '1337728', 'Revision should match.');
    assert.ok(
      fs.existsSync(stats.executablePath),
      `Executable path should exist: ${stats.executablePath}`
    );
  });

  it('sync getStats with revision: 1337728 (using PCR.getStats)', async () => {
    // Made async to allow PCR setup
    const options: Partial<PcrOptions> = {
      revision: '1337728',
    };
    // Ensure PCR runs for these options to create the specific stats file
    await PCR(options);
    const stats = (PCR as any).getStats(options);
    assert.ok(stats, 'PCR.getStats should return stats.');
    assert.ok(stats.executablePath, 'Stats should have an executablePath.');
    assert.strictEqual(stats.revision, '1337728', 'Revision should match.');
    assert.ok(
      fs.existsSync(stats.executablePath),
      `Executable path should exist: ${stats.executablePath}`
    );
  });

  it('async PCR with downloadPath: .test-temp-download', async () => {
    const downloadPath = '.test-temp-download';
    const options: Partial<PcrOptions> = {
      downloadPath: downloadPath,
    };

    const mergedOptionsForClean = ensurePcrOptionsForClean(options);
    cleanAll(mergedOptionsForClean);

    const stats = await PCR(options);
    assert.ok(stats, 'PCR should return stats.');
    assert.ok(stats.executablePath, 'Stats should have an executablePath.');
    assert.ok(
      fs.existsSync(stats.executablePath),
      `Executable path should exist: ${stats.executablePath}`
    );
    assert.ok(
      stats.cacheDir.includes(downloadPath),
      `Cache dir should be inside downloadPath. Got: ${stats.cacheDir}`
    );

    // Cleanup is important, but ensure it doesn't affect subsequent tests unexpectedly.
    // Consider if this cleanup should be in an afterEach or afterAll for this specific path.
    if (fs.existsSync(mergedOptionsForClean.cacheDir)) {
      fs.rmSync(mergedOptionsForClean.cacheDir, {
        recursive: true,
        force: true,
      });
    }
  });

  it('getStats with downloadPath: .test-temp-download (using PCR.getStats)', async () => {
    // Made async
    const downloadPath = '.test-temp-download';
    const options: Partial<PcrOptions> = {
      downloadPath: downloadPath,
    };
    // Ensure PCR runs for these options to create the specific stats file in the custom path
    const mergedOptionsForClean = ensurePcrOptionsForClean(options);
    cleanAll(mergedOptionsForClean); // Clean before this specific test's PCR run
    await PCR(options);

    const stats = (PCR as any).getStats(options);
    assert.ok(stats, 'PCR.getStats should return stats.');
    assert.ok(stats.executablePath, 'Stats should have an executablePath.');
    assert.ok(
      stats.cacheDir.includes(downloadPath), // Check against resolved downloadPath
      `Cache dir should be inside downloadPath. Got: ${stats.cacheDir}`
    );
    assert.ok(
      fs.existsSync(stats.executablePath),
      `Executable path should exist: ${stats.executablePath}`
    );
    // Clean up after this specific test
    if (fs.existsSync(mergedOptionsForClean.cacheDir)) {
      fs.rmSync(mergedOptionsForClean.cacheDir, {
        recursive: true,
        force: true,
      });
    }
  });

  it('async PCR with detectionPath: .test-temp-download (assuming a pre-existing chromium there)', async () => {
    const options: Partial<PcrOptions> = {
      detectionPath: '.test-temp-download',
    };
    const stats = await PCR(options);
    assert.ok(stats, 'PCR should return stats.');
    assert.ok(stats.executablePath, 'Stats should have an executablePath.');
    assert.ok(
      fs.existsSync(stats.executablePath),
      `Executable path should exist: ${stats.executablePath}`
    );
  });

  it('launch browser and open page', async () => {
    const stats = await PCR();
    assert.ok(stats, 'PCR should return stats for launch test.');
    assert.ok(
      stats.executablePath,
      'Stats should have an executablePath for launch test.'
    );
    assert.ok(stats.puppeteer, 'Stats should include puppeteer instance.');

    console.log('puppeteerVersion', stats.puppeteerVersion);
    console.log('executablePath', stats.executablePath);

    const browser = await stats.puppeteer
      .launch({
        headless: 'new' as any,
        args: ['--no-sandbox'],
        executablePath: stats.executablePath,
      } as LaunchOptions)
      .catch(function (err: Error) {
        console.error(EC.red(`Browser launch failed: ${err.message}`));
        throw err;
      });

    assert.ok(browser, 'Browser should be launched.');

    console.log('browser.newPage ...');
    const page = await browser.newPage();
    console.log('page.setContent ...');
    await page.setContent(
      '<html><head><title>puppeteer-chromium-resolver</title></head><body></body></html>'
    );

    console.log('check head title ...');
    const title = await page.$eval(
      'head title',
      (el: Element) => (el as HTMLElement).innerText
    );
    assert.strictEqual(
      title,
      'puppeteer-chromium-resolver',
      'Page title should match.'
    );

    console.log('browser.close ...');
    await browser.close().catch(function (err: Error) {
      console.error(EC.red(`Browser close failed: ${err.message}`));
    });
  });
});
