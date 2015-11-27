import cache from './cache.js';

export default class CanIUseParser {
  constructor() {
    this.results = {};
    this.url = 'https://raw.githubusercontent.com/Fyrd/caniuse/master/data.json';
  }

  majorVersion(version) {
    return parseInt(version.substr(0, version.indexOf('.')), 10);
  }

  read(options) {
    cache.readJson(this.url, options.cacheDir)
      .then((results) => {
        this.results = results;
      });
  }
}
