import * as PB from '@puppeteer/browsers';
import Gauge from 'gauge';
interface InstallUtilOptions extends Omit<PB.InstallOptions, 'browser' | 'unpack'> {
    buildId: string;
    cacheDir: string;
    platform?: PB.BrowserPlatform;
    downloadProgressCallback?: PB.InstallOptions['downloadProgressCallback'];
    baseUrl?: string;
}
interface ComputeExecutablePathUtilOptions {
    buildId: string;
    cacheDir: string;
    platform?: PB.BrowserPlatform;
}
interface UtilType {
    silent: boolean;
    gauge: Gauge | null;
    detectBrowserPlatform: () => PB.BrowserPlatform | undefined;
    resolveBuildId: (platform: PB.BrowserPlatform, tag?: string) => Promise<string>;
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
declare const Util: UtilType;
export default Util;
//# sourceMappingURL=util.d.ts.map