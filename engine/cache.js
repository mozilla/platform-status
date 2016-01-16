import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import crypto from 'crypto';

export default {
  readJson: (src, cacheDir) => {
    const shasum = crypto.createHash('sha1');
    shasum.update(src);
    const cacheFilename = path.join(cacheDir, shasum.digest('hex') + '.json');

    return new Promise((resolve, reject) => {
      fs.stat(cacheFilename, (statErr, stats) => {
        if (statErr) {
          if (statErr.code !== 'ENOENT') {
            return reject(statErr);
          }

          return fetch(src)
            .then((response) => response.text())
            .then((text) => {
              console.log('Caching data for: "'
                  + src + '" in "' + cacheFilename + '"');
              fs.writeFile(cacheFilename, text, (err) => {
                if (err) {
                  return reject(err);
                }
                try {
                  return resolve(JSON.parse(text));
                } catch (parseErr) {
                  return reject(parseErr);
                }
              });
            }).catch(function(err) {
              return reject(err);
            });
        }

        if (!stats.isFile()) {
          return reject(new Error(cacheFilename + ' (cache for ' + src
                        + ') exists but is not a file'));
        }
        fs.readFile(cacheFilename, (readErr, data) => {
          if (readErr) {
            return reject(readErr);
          }
          try {
            return resolve(JSON.parse(data));
          } catch (parseErr) {
            return reject(parseErr);
          }
        });
      });
    });
  },
};
