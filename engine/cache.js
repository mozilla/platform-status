import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import fileExists from 'file-exists';
import crypto from 'crypto';

export default {
  readJson: (src, cacheDir) => {
    const shasum = crypto.createHash('sha1');
    shasum.update(src);
    const cacheFilename = path.join(cacheDir, shasum.digest('hex') + '.json');
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
