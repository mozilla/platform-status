import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import fileExists from 'file-exists';

export default {
  readJson: (src, cacheDir) => {
    let cacheFilename = src;
    if (cacheFilename.endsWith('.json')) {
      cacheFilename = cacheFilename.substr(0, src.length - 5);
    }
    cacheFilename = path.join(cacheDir, cacheFilename.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() + '.json');
    if (fileExists(cacheFilename)) {
      return Promise.resolve(JSON.parse(fs.readFileSync(cacheFilename)));
    }
    return fetch(src)
      .then((response) => response.text())
      .then((text) => {
        console.log('Caching data for: "' + src + '" in "' + cacheFilename + '"');
        fs.writeFileSync(cacheFilename, text);
        return JSON.parse(text);
      });
  },
};
