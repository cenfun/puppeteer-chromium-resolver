import * as http from 'http';
import * as https from 'https';
import { URL as NodeURL } from 'url'; // Renamed to avoid conflict with global URL
import * as EC from 'eight-colors';
import * as PB from '@puppeteer/browsers';
import Gauge from 'gauge';

// For install, we need to ensure compatibility with PB.InstallOptions
interface InstallUtilOptions
  extends Omit<PB.InstallOptions, 'browser' | 'unpack'> {
  buildId: string;
  cacheDir: string; // Ensure cacheDir is part of the options
  platform?: PB.BrowserPlatform;
  downloadProgressCallback?: PB.InstallOptions['downloadProgressCallback'];
  baseUrl?: string;
}

// For computeExecutablePath, it needs cacheDir, buildId, and platform.
// This type should reflect the actual parameters needed by our Util.computeExecutablePath,
// which then passes them to PB.computeExecutablePath.
interface ComputeExecutablePathUtilOptions {
  buildId: string;
  cacheDir: string;
  platform?: PB.BrowserPlatform;
  // Do NOT include executablePath here as it's an output, not an input.
}

interface UtilType {
  silent: boolean;
  gauge: Gauge | null;
  detectBrowserPlatform: () => PB.BrowserPlatform | undefined;
  resolveBuildId: (
    platform: PB.BrowserPlatform,
    tag?: string
  ) => Promise<string>;
  install: (options: InstallUtilOptions) => Promise<PB.InstalledBrowser>;
  computeExecutablePath: (options: ComputeExecutablePathUtilOptions) => string;
  getPuppeteerVersion: () => string | undefined;
  headRequest: (url: string) => Promise<boolean>;
  output: (msg: string, isError?: boolean) => void;
  delay: (ms?: number) => Promise<void>;
  createGauge: () => void;
  closeGauge: () => void;
  showProgress: (downloadedBytes: number, totalBytes: number) => void;
  toMegabytes: (bytes: number) => string;
  formatPath: (str: string | undefined) => string | undefined;
  isList: (data: any) => data is any[];
}

const Util: UtilType = {
  silent: false,
  gauge: null,

  detectBrowserPlatform: (): PB.BrowserPlatform | undefined => {
    return PB.detectBrowserPlatform();
  },

  resolveBuildId: async (
    platform: PB.BrowserPlatform,
    tag = 'latest'
  ): Promise<string> => {
    const buildId = await PB.resolveBuildId(
      PB.Browser.CHROMIUM,
      platform,
      tag
    ).catch((e) => {
      // console.error('Error resolving buildId:', e);
    });
    return buildId || '1337728';
  },

  install: (options: InstallUtilOptions): Promise<PB.InstalledBrowser> => {
    const installOptions: PB.InstallOptions & { unpack: true } = {
      ...options, // options already contains cacheDir, buildId, platform etc.
      browser: PB.Browser.CHROMIUM,
      unpack: true,
    };
    return PB.install(installOptions);
  },

  computeExecutablePath: (
    options: ComputeExecutablePathUtilOptions
  ): string => {
    // Parameters<typeof PB.computeExecutablePath>[0] correctly infers the type:
    // { browser: Browser; platform?: BrowserPlatform; buildId: string; cacheDir: string; }
    const computeOptions: Parameters<typeof PB.computeExecutablePath>[0] = {
      buildId: options.buildId,
      cacheDir: options.cacheDir,
      platform: options.platform,
      browser: PB.Browser.CHROMIUM,
    };
    return PB.computeExecutablePath(computeOptions);
  },

  getPuppeteerVersion: (): string | undefined => {
    let config;
    try {
      config = require('puppeteer-core/package.json');
    } catch (e) {
      return undefined;
    }
    if (config && typeof config.version === 'string') {
      return config.version;
    }
    return undefined;
  },

  headRequest: (url: string): Promise<boolean> => {
    return new Promise((resolve) => {
      const urlParsed = new NodeURL(url);
      let client: typeof http | typeof https;
      if (urlParsed.protocol === 'https:') {
        client = https;
      } else {
        client = http;
      }

      const requestOptions: https.RequestOptions = {
        protocol: urlParsed.protocol,
        hostname: urlParsed.hostname,
        port: urlParsed.port,
        path: urlParsed.pathname + urlParsed.search,
        method: 'HEAD',
      };

      const request = client.request(requestOptions);
      request.setTimeout(3000);
      request.end();

      const onFinish = (value: boolean | Promise<boolean>) => {
        if (!request.destroyed) {
          request.destroy();
        }
        resolve(value);
      };

      request.on('error', (error) => {
        onFinish(false);
      });

      request.on('timeout', () => {
        onFinish(false);
      });

      request.on('close', () => {
        // No specific action needed here
      });

      request.on('response', (res: http.IncomingMessage) => {
        const { statusCode, headers } = res;
        if (
          statusCode &&
          statusCode >= 300 &&
          statusCode < 400 &&
          headers.location
        ) {
          onFinish(Util.headRequest(headers.location));
          return;
        }
        onFinish(statusCode === 200);
      });
    });
  },

  output: (msg: string, isError?: boolean): void => {
    if (!Util.silent) {
      if (isError) {
        console.log(EC.red(`[PCR] ${msg}`));
      } else {
        console.log(`[PCR] ${msg}`);
      }
    }
  },

  delay: function (ms?: number): Promise<void> {
    return new Promise((resolve) => {
      if (ms) {
        setTimeout(resolve, ms);
      } else {
        setImmediate(resolve);
      }
    });
  },

  createGauge: (): void => {
    Util.closeGauge();
    Util.gauge = new Gauge();
  },

  closeGauge: (): void => {
    if (!Util.gauge) {
      return;
    }
    Util.gauge.disable();
    Util.gauge.hide();
    Util.gauge = null;
  },

  showProgress: (downloadedBytes: number, totalBytes: number): void => {
    let per = 0;
    if (totalBytes > 0) {
      per = downloadedBytes / totalBytes;
    }
    if (Util.gauge) {
      Util.gauge.show(
        `Downloading Chromium - ${Util.toMegabytes(
          downloadedBytes
        )} / ${Util.toMegabytes(totalBytes)}`,
        per
      );
    }
  },

  toMegabytes: (bytes: number): string => {
    const mb = bytes / 1024 / 1024;
    return `${Math.round(mb * 10) / 10} Mb`;
  },

  formatPath: (str: string | undefined): string | undefined => {
    if (str) {
      return str.replace(/\\\\/g, '/');
    }
    return str;
  },

  isList: (data: any): data is any[] => {
    return Array.isArray(data) && data.length > 0;
  },
};

export default Util;
