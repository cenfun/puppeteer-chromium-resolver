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
const EC = __importStar(require("eight-colors"));
const index_1 = __importDefault(require("./index")); // PCR is the default export from index.ts
const { PUPPETEER_SKIP_DOWNLOAD } = process.env;
// skip download when install
if (PUPPETEER_SKIP_DOWNLOAD && PUPPETEER_SKIP_DOWNLOAD !== 'false') {
    // eight-colors' logYellow is not directly available on the EC namespace.
    // Assuming it's a custom extension or we should use EC.yellow()
    // For now, let's use console.log with EC.yellow for styling.
    console.log(EC.yellow('[PCR] PUPPETEER_SKIP_DOWNLOAD is set, skipping download.'));
}
else {
    // PCR is an async function, so we should handle its Promise.
    // Typically, an install script might not wait, but for correctness:
    (0, index_1.default)()
        .then(() => {
        // Optional: log success or handle errors if PCR promise rejects
        // console.log(EC.green('[PCR] Chromium check/download process completed.'));
    })
        .catch((error) => {
        console.error(EC.red('[PCR] Error during Chromium check/download:'), error);
        process.exitCode = 1; // Indicate failure
    });
}
//# sourceMappingURL=install.js.map