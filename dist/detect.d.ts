interface DetectOptions {
    detectionPath?: string | string[];
    snapshotsDir: string;
    folderName: string;
    revision: string;
    executablePath?: string;
    cacheDir?: string;
}
declare const detectLocalChromium: (options: DetectOptions) => boolean;
export default detectLocalChromium;
//# sourceMappingURL=detect.d.ts.map