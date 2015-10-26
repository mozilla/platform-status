import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import fileExists from 'file-exists';

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
    ie: 'https://raw.githubusercontent.com/MicrosoftEdge/Status/production/app/static/ie-status.json',
  };

  read(options) {
    const cacheDir = options.cacheDir;
    return Promise.all([
      this.readJson(this.urls.webkitCore, cacheDir)
        .then((coreResults) => {
          // Combine the web core and javascript core specs and features.
          return this.readJson(this.urls.webkitJavaScript, cacheDir).then((jsResults) => {
            coreResults.specification = Array.concat(coreResults.specification, jsResults.specification);
            coreResults.features = Array.concat(coreResults.features, jsResults.features);
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
      this.readJson(this.urls.chrome, cacheDir)
        .then((results) => {
          this.results.chrome = new Map(
            results.map(entry => [entry.id, entry])
          );
        }),
      this.readJson(this.urls.ie, cacheDir)
        .then((results) => {
          this.results.ie = new Map(
            results.map(entry => [entry.name, entry])
          );
        }),
    ]);
  }

  readJson(src, cacheDir) {
    const cacheFilename = path.join(cacheDir, src.substr(0, src.length - 5).replace(/[^a-zA-Z0-9]/g, '').toLowerCase() + '.json');
    if (fileExists(cacheFilename)) {
      return Promise.resolve(JSON.parse(fs.readFileSync(cacheFilename)));
    }
    return fetch(src)
      .then((response) => response.text())
      .then((text) => {
        console.log('Caching browser status data for: "' + src + '" in "' + cacheFilename + '"');
        fs.writeFileSync(cacheFilename, text);
        return JSON.parse(text);
      });
  }
}
