import cache from './cache.js';

export default class FirefoxVersionParser {
  constructor() {
    this.results = {}
    this.url = 'https://svn.mozilla.org/libs/product-details/json/firefox_versions.json';
  }

  majorVersion(version) {
    return parseInt(version.substr(0, version.indexOf('.')), 10);
  }

  read(options) {
    cache.readJson(this.url, options.cacheDir)
      .then((results) => {
        this.results = {
          stable: this.majorVersion(results.LATEST_FIREFOX_VERSION),
          beta: this.majorVersion(results.LATEST_FIREFOX_DEVEL_VERSION),
          aurora: this.majorVersion(results.FIREFOX_AURORA),
          nightly: this.majorVersion(results.FIREFOX_AURORA) + 1, // File doesn't have nightly.
        };
      });
  }
}
