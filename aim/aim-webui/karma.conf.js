// Karma configuration file, see link for more information
// https://karma-runner.github.io/1.0/config/configuration-file.html

// CI installs chrome-headless-shell into PUPPETEER_CACHE_DIR (see Jenkinsfile). Resolve that binary
// for Karma; fall back to full Chrome from Puppeteer when the headless shell cache is missing (e.g. local dev).
const path = require('path');
const fs = require('fs');
const {
  computeExecutablePath,
  Browser,
  detectBrowserPlatform,
  getVersionComparator,
} = require('@puppeteer/browsers');
const puppeteer = require('puppeteer');

if (!process.env.PUPPETEER_CACHE_DIR && process.platform === 'linux') {
  process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '..', '..', '.cache', 'puppeteer');
}

/**
 * @returns {string | null} Absolute path to chrome-headless-shell in the Puppeteer cache, if present.
 */
function resolveCachedHeadlessShellExecutable(cacheDir) {
  const shellRoot = path.join(cacheDir, Browser.CHROMEHEADLESSSHELL);
  if (!fs.existsSync(shellRoot)) {
    return null;
  }
  const platform = detectBrowserPlatform();
  const prefix = `${platform}-`;
  const cmp = getVersionComparator(Browser.CHROMEHEADLESSSHELL);
  const dirs = fs
    .readdirSync(shellRoot)
    .filter((name) => {
      if (!name.startsWith(prefix)) {
        return false;
      }
      return fs.statSync(path.join(shellRoot, name)).isDirectory();
    })
    .sort((a, b) => cmp(a.slice(prefix.length), b.slice(prefix.length)));
  const dirName = dirs.at(-1);
  if (!dirName) {
    return null;
  }
  const buildId = dirName.slice(prefix.length);
  return computeExecutablePath({
    cacheDir,
    browser: Browser.CHROMEHEADLESSSHELL,
    buildId,
    platform,
  });
}

if (!process.env.CHROME_BIN) {
  const cacheDir = process.env.PUPPETEER_CACHE_DIR;
  const headlessShell =
    cacheDir && resolveCachedHeadlessShellExecutable(cacheDir);
  if (headlessShell) {
    process.env.CHROME_BIN = headlessShell;
  } else {
    try {
      process.env.CHROME_BIN = puppeteer.executablePath();
    } catch {
      /* No downloaded Chrome; karma-chrome-launcher may still find a system browser. */
    }
  }
}

module.exports = function (config) {
  config.set({
    basePath: '',
    frameworks: ['jasmine', '@angular-devkit/build-angular'],
    plugins: [
      require('karma-jasmine'),
      require('karma-chrome-launcher'),
      require('karma-jasmine-html-reporter'),
      require('karma-coverage'),
      require('@angular-devkit/build-angular/plugins/karma')
    ],
    client: {
      jasmine: {
        // you can add configuration options for Jasmine here
        // the possible options are listed at https://jasmine.github.io/api/edge/Configuration.html
        // for example, you can disable the random execution with `random: false`
        // or set a specific seed with `seed: 4321`
      },
    },
    jasmineHtmlReporter: {
      suppressAll: true // removes the duplicated traces
    },
    coverageReporter: {
      dir: require('path').join(__dirname, './coverage/aim-webui'),
      subdir: '.',
      reporters: [
        { type: 'html' },
        { type: 'text-summary' },
        { type: 'lcov', subdir: '.' }
      ]
    },
    reporters: ['progress', 'kjhtml'],
    // browsers: ['Chrome'],
    browsers: ['ChromeHeadlessCI'],
    customLaunchers: {
      ChromeHeadlessCI: {
        base: 'ChromeHeadless',
        flags: [
          '--no-sandbox',
          '--disable-gpu',
          '--disable-dev-shm-usage',
          '--no-proxy-server'
        ]
      }
    },
    singleRun: true,
    restartOnFileChange: false
  });
};
