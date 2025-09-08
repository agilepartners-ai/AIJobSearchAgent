/**
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
    // Download Chrome (default `skipDownload: false`).
    chrome: {
      skipDownload: true,
    },
    // Download Firefox (default `skipDownload: true`).
    firefox: {
      skipDownload: false,
    },
  };