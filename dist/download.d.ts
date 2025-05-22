import * as PB from '@puppeteer/browsers';
interface DownloadOptions {
    revision: string;
    snapshotsDir: string;
    platform: PB.BrowserPlatform;
    hosts: string[];
    retry: number;
    downloadHost?: string;
    downloadProgressCallback?: (downloadedBytes: number, totalBytes: number) => void;
    retryNum?: number;
    installedBrowser?: PB.InstalledBrowser;
    executablePath?: string;
}
declare const downloadChromium: (options: DownloadOptions) => Promise<void>;
export default downloadChromium;
//# sourceMappingURL=download.d.ts.map