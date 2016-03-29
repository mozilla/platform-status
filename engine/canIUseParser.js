import cache from './cache.js';

export default class CanIUseParser {
  results = {};
  url = 'https://raw.githubusercontent.com/Fyrd/caniuse/master/data.json';

  majorVersion(version) {
    return parseInt(version.substr(0, version.indexOf('.')), 10);
  }

  read() {
    return cache.readJson(this.url)
      .then((results) => {
        this.results = results;
      });
  }
}
