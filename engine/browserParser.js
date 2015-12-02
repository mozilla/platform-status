import cache from './cache.js';

export default class BrowserParser {
  constructor() {
    this.results = {
      webkit: new Map(),
      chrome: new Map(),
      ie: new Map(),
    };

    this.urls = {
      chrome: 'https://www.chromestatus.com/features.json',
      webkitCore: 'https://svn.webkit.org/repository/webkit/trunk/Source/WebCore/features.json',
      webkitJavaScript: 'https://svn.webkit.org/repository/webkit/trunk/Source/JavaScriptCore/features.json',
      ie: 'https://raw.githubusercontent.com/MicrosoftEdge/Status/production/app/static/ie-status.json',
    };
  }

  read(options) {
    const cacheDir = options.cacheDir;
    return Promise.all([
      cache.readJson(this.urls.webkitCore, cacheDir)
        .then((coreResults) => {
          // Combine the web core and javascript core specs and features.
          return cache.readJson(this.urls.webkitJavaScript, cacheDir).then((jsResults) => {
            coreResults.specification = coreResults.specification.concat(jsResults.specification);
            coreResults.features = coreResults.features.concat(jsResults.features);
            return coreResults;
          });
        })
        .then((results) => {
          results.specification.forEach((spec) => {
            spec.type = 'specification';
          });
          results.features.forEach((feature) => {
            feature.type = 'feature';
          });
          const merged = results.specification.concat(results.features);
          this.results.webkit = new Map(
            merged.map(entry => [entry.name, entry])
          );
        }),
      cache.readJson(this.urls.chrome, cacheDir)
        .then((results) => {
          this.results.chrome = new Map(
            results.map(entry => [entry.id, entry])
          );
        }),
      cache.readJson(this.urls.ie, cacheDir)
        .then((results) => {
          this.results.ie = new Map(
            results.map(entry => [entry.name, entry])
          );
        }),
    ]);
  }
}
