"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const EC = __importStar(require("eight-colors"));
const util_1 = __importDefault(require("./util")); // Assuming util.ts exports Util as default
const getDetectionPath = (options) => {
    let detectionPath = options.detectionPath;
    if (Array.isArray(detectionPath)) {
        return detectionPath;
    }
    if (typeof detectionPath === 'string' && detectionPath) {
        return detectionPath.split(',');
    }
    return [];
};
const getDetectionList = (options) => {
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
        }
        else {
            current = parent;
        }
        level += 1;
    }
    return detectionList;
};
const detectionPathHandler = (options, detectionPath) => {
    const resolvedDetectionPath = path.resolve(detectionPath);
    const revision = options.revision;
    // Ensure options.cacheDir is set for Util.computeExecutablePath
    // If detectionPath itself is the cacheDir for this specific check:
    const executablePath = util_1.default.computeExecutablePath({
        buildId: revision,
        cacheDir: resolvedDetectionPath, // Use resolvedDetectionPath as cacheDir for this specific check
        platform: util_1.default.detectBrowserPlatform(), // Platform might be needed
    });
    if (!executablePath || !fs.existsSync(executablePath)) {
        return undefined;
    }
    return executablePath;
};
const detectionHandler = (options) => {
    const detectionList = getDetectionList(options);
    for (const currentDetectionPath of detectionList) {
        if (!currentDetectionPath)
            continue; // Skip if path is empty or undefined
        const executablePath = detectionPathHandler(options, currentDetectionPath);
        if (executablePath) {
            return executablePath;
        }
    }
    return null;
};
const detectLocalChromium = (options) => {
    const executablePath = detectionHandler(options);
    if (executablePath) {
        options.executablePath = executablePath; // Mutates options
        util_1.default.output(`Found local chromium: ${EC.green(options.revision)}`);
        return true;
    }
    util_1.default.output(EC.yellow('Not found local chromium'));
    return false;
};
exports.default = detectLocalChromium;
//# sourceMappingURL=detect.js.map