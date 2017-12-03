import cache from './cache';

export default class BrowserParser {
  results = {
    webkit: new Map(),
    chrome: new Map(),
    ie: new Map(),
  };

  urls = {
    chrome: 'https://www.chromestatus.com/features.json',
    webkitCore: 'https://svn.webkit.org/repository/webkit/trunk/Source/WebCore/features.json',
    webkitJavaScript: 'https://svn.webkit.org/repository/webkit/trunk/Source/JavaScriptCore/features.json',
    ie: 'https://raw.githubusercontent.com/MicrosoftEdge/Status/production/status.json',
  };

  read() {
    return Promise.all([
      cache.readJson(this.urls.webkitCore)
        .then((coreResults) =>
          // Combine the web core and javascript core specs and features.
          cache.readJson(this.urls.webkitJavaScript).then((jsResults) => {
            coreResults.specification = coreResults.specification.concat(jsResults.specification);
            coreResults.features = coreResults.features.concat(jsResults.features);
            return coreResults;
          })
        )
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
        })
        .catch(e => console.warn(`Error retrieving WebKit status: ${e}`)),
      cache.readJson(this.urls.chrome)
        .then((results) => {
          this.results.chrome = new Map(
            results.map(entry => [entry.id, entry])
          );
        })
        .catch(e => console.warn(`Error retrieving Chrome status: ${e}`)),
      cache.readJson(this.urls.ie)
        .then(results => {
          this.results.ie = new Map(
            results.map(entry => [entry.name, entry])
          );
        })
        .catch(e => console.warn(`Error retrieving IE status: ${e}`)),
    ]);
  }
}
