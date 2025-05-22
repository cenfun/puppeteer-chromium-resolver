export interface PcrDefaultOptions {
    /**
     * The Chromium revision to use.
     * Default is an empty string, which means PCR will try to resolve it,
     * often based on Puppeteer's preferred revision.
     */
    revision: string;
    /**
     * Additional path(s) to detect a local Chromium copy.
     * Can be a single string path or multiple paths separated by a comma.
     */
    detectionPath: string | string[];
    /**
     * Custom path to download Chromium to.
     * If not specified, the user's home directory is typically used.
     * Requires write permissions (e.g., 0o777) for the specified directory.
     */
    downloadPath: string;
    /**
     * The folder name for storing Chromium snapshots.
     * This folder is created within the `downloadPath` or a default cache directory.
     */
    folderName: string;
    /**
     * The name of the file used to cache statistics about the last installation.
     * This file is typically stored in the `cacheDir`.
     */
    statsName: string;
    /**
     * A list of download hosts to try for fetching Chromium.
     * Defaults to ['https://storage.googleapis.com'] if empty or not provided.
     * Can be overridden by the PUPPETEER_DEFAULT_HOST environment variable.
     */
    hosts: string[];
    /**
     * Number of old revisions to keep in the cache.
     * (Note: This property was in the original JS but its usage isn't immediately obvious
     * from the provided snippets. Included for completeness.)
     */
    cacheRevisions: number;
    /**
     * Number of times to retry downloading Chromium if it fails.
     */
    retry: number;
    /**
     * If true, suppresses console output from PCR.
     */
    silent: boolean;
}
declare const defaultOptions: PcrDefaultOptions;
export default defaultOptions;
//# sourceMappingURL=options.d.ts.map