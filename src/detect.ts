import * as fs from 'fs';
import * as path from 'path';
import * as EC from 'eight-colors';
import Util from './util'; // Assuming util.ts exports Util as default

// Define an interface for the options object
// This will need to be refined based on how options is used across the project
interface DetectOptions {
  detectionPath?: string | string[];
  snapshotsDir: string; // Assuming this is always provided
  folderName: string; // Assuming this is always provided
  revision: string; // Assuming this is always provided
  executablePath?: string; // This can be set by the detection logic
  cacheDir?: string; // Util.computeExecutablePath needs cacheDir
  // Add any other properties that are expected on options
}

const getDetectionPath = (options: DetectOptions): string[] => {
  let detectionPath = options.detectionPath;
  if (Array.isArray(detectionPath)) {
    return detectionPath;
  }
  if (typeof detectionPath === 'string' && detectionPath) {
    return detectionPath.split(',');
  }
  return [];
};

const getDetectionList = (options: DetectOptions): string[] => {
  const detectionList = getDetectionPath(options);
  detectionList.push(options.snapshotsDir);

  const maxLevel = 5;
  let level = 0;
  let current = process.cwd();
  while (current && level < maxLevel) {
    const dir = path.resolve(current, options.folderName);
    detectionList.push(dir);
    const parent = path.resolve(current, '../');
    if (parent === current) {
      current = ''; // Break loop if parent is the same (root)
    } else {
      current = parent;
    }
    level += 1;
  }
  return detectionList;
};

const detectionPathHandler = (
  options: DetectOptions,
  detectionPath: string
): string | undefined => {
  const resolvedDetectionPath = path.resolve(detectionPath);
  const revision = options.revision;

  // Ensure options.cacheDir is set for Util.computeExecutablePath
  // If detectionPath itself is the cacheDir for this specific check:
  const executablePath = Util.computeExecutablePath({
    buildId: revision,
    cacheDir: resolvedDetectionPath, // Use resolvedDetectionPath as cacheDir for this specific check
    platform: Util.detectBrowserPlatform(), // Platform might be needed
  });

  if (!executablePath || !fs.existsSync(executablePath)) {
    return undefined;
  }
  return executablePath;
};

const detectionHandler = (options: DetectOptions): string | null => {
  const detectionList = getDetectionList(options);
  for (const currentDetectionPath of detectionList) {
    if (!currentDetectionPath) continue; // Skip if path is empty or undefined
    const executablePath = detectionPathHandler(options, currentDetectionPath);
    if (executablePath) {
      return executablePath;
    }
  }
  return null;
};

const detectLocalChromium = (options: DetectOptions): boolean => {
  const executablePath = detectionHandler(options);
  if (executablePath) {
    options.executablePath = executablePath; // Mutates options
    Util.output(`Found local chromium: ${EC.green(options.revision)}`);
    return true;
  }
  Util.output(EC.yellow('Not found local chromium'));
  return false;
};

export default detectLocalChromium;
