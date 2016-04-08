import cache from './cache.js';

export default class CanIUseParser {
  results = {};
  url = 'https://raw.githubusercontent.com/Fyrd/caniuse/master/data.json';

  read() {
    return cache.readJson(this.url)
      .then((results) => {
        this.results = results;
      });
  }
}
