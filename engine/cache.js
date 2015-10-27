import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import fileExists from 'file-exists';

export default {
  readJson: (src, cacheDir) => {
    const cacheFilename = path.join(cacheDir, src.substr(0, src.length - 5).replace(/[^a-zA-Z0-9]/g, '').toLowerCase() + '.json');
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
