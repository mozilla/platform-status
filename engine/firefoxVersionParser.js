import cache from './cache';

export default class FirefoxVersionParser {
  results = {};
  url = 'https://product-details.mozilla.org/1.0/firefox_versions.json';

  majorVersion(version) {
    return parseInt(version.substr(0, version.indexOf('.')), 10);
  }

  read() {
    return cache.readJson(this.url)
      .then((results) => {
        this.results = {
          stable: this.majorVersion(results.LATEST_FIREFOX_VERSION),
          beta: this.majorVersion(results.LATEST_FIREFOX_DEVEL_VERSION),
          nightly: this.majorVersion(results.FIREFOX_NIGHTLY),
        };
      });
  }
}
