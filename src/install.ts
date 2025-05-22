import * as EC from 'eight-colors';
import PCR from './index'; // PCR is the default export from index.ts

const { PUPPETEER_SKIP_DOWNLOAD } = process.env;

// skip download when install
if (PUPPETEER_SKIP_DOWNLOAD && PUPPETEER_SKIP_DOWNLOAD !== 'false') {
  // eight-colors' logYellow is not directly available on the EC namespace.
  // Assuming it's a custom extension or we should use EC.yellow()
  // For now, let's use console.log with EC.yellow for styling.
  console.log(
    EC.yellow('[PCR] PUPPETEER_SKIP_DOWNLOAD is set, skipping download.')
  );
} else {
  // PCR is an async function, so we should handle its Promise.
  // Typically, an install script might not wait, but for correctness:
  PCR()
    .then(() => {
      // Optional: log success or handle errors if PCR promise rejects
      // console.log(EC.green('[PCR] Chromium check/download process completed.'));
    })
    .catch((error) => {
      console.error(
        EC.red('[PCR] Error during Chromium check/download:'),
        error
      );
      process.exitCode = 1; // Indicate failure
    });
}
