// Karma configuration
// Generated on Sun Oct 24 2021 14:22:29 GMT-0500 (Central Daylight Time)

// Use Puppeteer to install chromium and provide the path to Karma
process.env.CHROME_BIN = require('puppeteer').executablePath()

module.exports = function (config) {
    config.set({
        // list of files / patterns to load in the browser
        files: [
            {pattern: 'example/index.html', type: 'html', include: false},
            {pattern: 'src/*.js', type: 'module', include: false},
            {pattern: 'spec/*.js', type: 'module', include: true}
        ],

        frameworks: ['jasmine'],
        exclude: [],
        preprocessors: {},
        reporters: ['dots'],
        port: 9876,
        colors: true,
        logLevel: config.LOG_WARN,
        autoWatch: true,
        browsers: ['ChromeHeadless'],
        singleRun: false,
        concurrency: Infinity
    })
}
