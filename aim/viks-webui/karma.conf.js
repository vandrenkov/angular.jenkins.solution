// Karma configuration file, see link for more information
// https://karma-runner.github.io/1.0/config/configuration-file.html

// Resolve Chromium from Puppeteer (same pattern as many Angular+Karma CI setups).
// Jenkins sets PUPPETEER_CACHE_DIR. On Linux without env, default to shared agent cache (Windows dev uses Puppeteer default).
if (!process.env.PUPPETEER_CACHE_DIR && process.platform === 'linux') {
  process.env.PUPPETEER_CACHE_DIR = '/mnt/vladimir/.cache/puppeteer';
}
const puppeteer = require('puppeteer');
process.env.CHROME_BIN = puppeteer.executablePath();

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
      dir: require('path').join(__dirname, './coverage/viks-webui'),
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
      /*
      //New logic
      ChromeHeadlessCI: {
        base: 'ChromeHeadless',
        flags: [
          '--no-sandbox',
          '--disable-gpu',
          '--disable-dev-shm-usage',
          '--no-proxy-server'
        ]
      },
      */
      // old logic
      ChromeHeadless: {
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
