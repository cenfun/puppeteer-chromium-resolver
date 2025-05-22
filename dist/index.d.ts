import { PuppeteerNode } from 'puppeteer-core';
import * as PB from '@puppeteer/browsers';
import { PcrDefaultOptions } from './options';
export interface PcrOptions extends PcrDefaultOptions {
    puppeteerVersion?: string;
    platform: PB.BrowserPlatform;
    revision: string;
    executablePath?: string;
    chromiumVersion?: string;
    launchable?: boolean;
    cacheDir: string;
    snapshotsDir: string;
    installedBrowser?: PB.InstalledBrowser;
    retryNum?: number;
    hosts: string[];
}
export interface StatsInfo {
    puppeteerVersion?: string;
    platform: PB.BrowserPlatform;
    revision: string;
    cacheDir: string;
    snapshotsDir: string;
    executablePath?: string;
    chromiumVersion?: string;
    launchable?: boolean;
    puppeteer: PuppeteerNode;
}
export declare const getResolvedOptions: (initialOptions?: Partial<PcrOptions>) => PcrOptions;
export declare const getStatsFromFile: (optionsInput?: Partial<PcrOptions>) => StatsInfo | undefined;
declare const PCR: (initialOptions?: Partial<PcrOptions>) => Promise<StatsInfo | undefined>;
export default PCR;
//# sourceMappingURL=index.d.ts.map