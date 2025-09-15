const { join } = require('path');

/**
 * @type {import("puppeteer-core").Configuration}
 */
module.exports = {
  // Configure Puppeteer cache directory
  cacheDirectory: join(process.cwd(), '.cache', 'puppeteer'),
  // Skip download since we're using puppeteer-core
  skipDownload: true,
  // Will be set dynamically based on environment
  executablePath: undefined,
};
