import fetch from 'node-fetch';

export default class BrowserParser {
  results = {
    webkit: new Map(),
    chrome: new Map(),
    ie: new Map(),
  };

  urls = {
    chrome: 'https://www.chromestatus.com/features.json',
    webkit: 'https://svn.webkit.org/repository/webkit/trunk/Source/WebCore/features.json',
    ie: 'https://raw.githubusercontent.com/MicrosoftEdge/Status/production/app/static/ie-status.json',
  };

  read() {
    return Promise.all([
      this.readJson(this.urls.webkit)
        .then((results) => {
          const merged = results.specification.concat(results.features);
          this.results.webkit = new Map(
            merged.map(entry => [entry.name, entry])
          );
        }),
      this.readJson(this.urls.chrome)
        .then((results) => {
          this.results.chrome = new Map(
            results.map(entry => [entry.id, entry])
          );
        }),
      this.readJson(this.urls.ie)
        .then((results) => {
          this.results.ie = new Map(
            results.map(entry => [entry.name, entry])
          );
        }),
    ]);
  }

  readJson(src) {
    return fetch(src)
      .then((response) => response.json());
  }
}
