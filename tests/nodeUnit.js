// This file is written as an AMD module that will be loaded by the Intern
// test client. The test client can load node modules directly to test
// that individual pieces are working as expected.
//
// The flow for each test is generally:
//   1. Load the module you wish to perform unit tests on
//   2. Call the functions of that module directly and use the assert
//      library to verify expected results
//
// More info on writing Unit tests with Intern:
//    https://theintern.github.io/intern/#writing-unit-test
//
// We have chosen to use Intern's "BDD" interface (as opposed to the other
// options that Intern provides - "Object," "TDD," and "QUnit"):
//    https://theintern.github.io/intern/#interface-tdd/
//
// We have chosen to use Chai's "assert" library (as opposed to the other
// options that Chai provides - "expect" and "should"):
//    http://chaijs.com/api/assert/

define(function(require) {
  const bdd = require('intern!bdd');
  const assert = require('intern/chai!assert');
  const fs = require('intern/dojo/node!fs');
  const path = require('intern/dojo/node!path');

  const publicDir = 'dist/public';

  function rm(filepath) {
    return new Promise(function(resolve, reject) {
      fs.stat(filepath, function(statErr, stats) {
        if (statErr) {
          return reject(statErr);
        }

        if (stats.isFile()) {
          return fs.unlink(filepath, function(unlinkErr) {
            if (unlinkErr) {
              return reject(unlinkErr);
            }
            return resolve();
          });
        }

        if (stats.isDirectory()) {
          return fs.readdir(filepath, function(readdirErr, files) {
            if (readdirErr) {
              return reject(readdirErr);
            }
            var promises = [Promise.resolve()];
            files.forEach(function(file) {
              promises.push(rm(path.join(filepath, file)));
            });
            return Promise.all(promises).then(function() {
              fs.rmdir(filepath, function(rmdirErr) {
                if (rmdirErr) {
                  return reject(rmdirErr);
                }
                return resolve();
              });
            });
          });
        }

        return reject(new Error('rm can only delete files/dirs'));
      });
    });
  }

  bdd.describe('Node unit', function() {
    bdd.before(function() {
      // This modifies the node module loader to work with es2015 modules.
      // All subsequent `require` calls that use the node module loader
      // will use this modified version and will be able to load es2015
      // modules.
      require('intern/dojo/node!babel-core/register');
    });

    bdd.describe('Build process', function() {
      bdd.it('should output readable expected files and only expected files', function() {
        // Please keep this list alphabetically sorted. It is case sensitive.
        var expectedFiles = [
          'dist/public/bundle.css',
          'dist/public/bundle.css.map',
          'dist/public/bundle.js',
          'dist/public/bundle.js.map',
          'dist/public/images/browsers/chrome_64x64.png',
          'dist/public/images/browsers/edge_64x64.png',
          'dist/public/images/browsers/firefox_64x64.png',
          'dist/public/images/browsers/firefox-beta_64x64.png',
          'dist/public/images/browsers/firefox-developer-edition_64x64.png',
          'dist/public/images/browsers/firefox-nightly_64x64.png',
          'dist/public/images/browsers/safari_64x64.png',
          'dist/public/images/browsers/opera_64x64.png',
          'dist/public/images/anchor.svg',
          'dist/public/images/bugzilla.png',
          'dist/public/images/bugzilla@2x.png',
          'dist/public/images/caniuse.png',
          'dist/public/images/caniuse@2x.png',
          'dist/public/images/favicon-192.png',
          'dist/public/images/favicon-196.png',
          'dist/public/images/favicon.ico',
          'dist/public/images/firefox.svg',
          'dist/public/images/github.png',
          'dist/public/images/github@2x.png',
          'dist/public/images/html5.png',
          'dist/public/images/html5@2x.png',
          'dist/public/images/ios-icon-180.png',
          'dist/public/images/mdn.png',
          'dist/public/images/mdn@2x.png',
          'dist/public/images/tabzilla-static.png',
          'dist/public/images/tabzilla-static-high-res.png',
          'dist/public/index.html',
          'dist/public/manifest.json',
          'dist/public/offline-worker.js',
          'dist/public/status.json'
        ];

        var ignoreDirs = [
        ];

        function processPath(filepath) {
          return new Promise(function(resolve, reject) {
            if (ignoreDirs.indexOf(filepath) > -1) {
              resolve();
            }
            fs.stat(filepath, function(statErr, stats) {
              if (statErr) {
                return reject(filepath + ': ' + statErr);
              }

              if (stats.isFile()) {
                return fs.access(filepath, fs.F_OK | fs.R_OK, function(accessErr) {
                  if (accessErr) {
                    return reject(filepath + ': ' + accessErr);
                  }

                  var index = expectedFiles.indexOf(filepath);
                  if (index === -1) {
                    return reject(new Error('Unexpected file: ' + filepath));
                  }
                  expectedFiles.splice(index, 1);

                  return resolve();
                });
              }

              if (stats.isDirectory()) {
                return fs.readdir(filepath, function(readErr, files) {
                  if (readErr) {
                    return reject(filepath + ': ' + readErr);
                  }

                  var promises = files.map(function(filename) {
                    var dirpath = filepath + '/' + filename;
                    return processPath(dirpath);
                  });

                  return Promise.all(promises)
                    .then(resolve)
                    .catch(reject);
                });
              }

              return reject(filepath + ' is not a file or a directory');
            });
          });
        }

        return processPath(publicDir).then(function() {
          if (expectedFiles.length !== 0) {
            throw new Error('File(s) not found: ' + expectedFiles);
          }
        });
      });
    });

    bdd.describe('Engine', function() {
      bdd.describe('fixtureParser', function() {
        bdd.it('should something', function() {
          var FixtureParser = require('intern/dojo/node!../../../../engine/fixtureParser').default;
          var fp = new FixtureParser('asdf');
          assert(fp);
        });
      });

      bdd.describe('normalizeStatus', function() {
        bdd.it('should convert empty strings', function() {
          var indexJS = require('intern/dojo/node!../../../../engine/index').test;
          assert.equal(indexJS.normalizeStatus(''), 'unknown');
        });

        bdd.it('should leave known strings untouched', function() {
          var indexJS = require('intern/dojo/node!../../../../engine/index').test;

          var strings = [
            'unknown',
            'not-planned',
            'deprecated',
            'under-consideration',
            'in-development',
            'shipped',
          ];

          strings.forEach(function(val) {
            assert.equal(indexJS.normalizeStatus(val), val);
          });
        });

        bdd.it('should throw Error objects for invalid strings', function() {
          var indexJS = require('intern/dojo/node!../../../../engine/index').test;
          assert.throws(indexJS.normalizeStatus.bind(null, 'asdf'));
          assert.throws(indexJS.normalizeStatus.bind(null, 'a string'));

          assert.throws(indexJS.normalizeStatus.bind(null, '-8023'));
          assert.throws(indexJS.normalizeStatus.bind(null, '91257'));

          assert.throws(indexJS.normalizeStatus.bind(null, 1234));
          assert.throws(indexJS.normalizeStatus.bind(null, -1234));

          assert.throws(indexJS.normalizeStatus.bind(null, null));
          assert.throws(indexJS.normalizeStatus.bind(null));
        });
      });
    });

    bdd.describe('Cache', function() {
      const cache = require('intern/dojo/node!../../../../engine/cache').default;
      const cacheDir = 'tests/support/var/engineCache';

      bdd.before(function() {
        // Make dir to cache files to during tests
        fs.mkdirSync(cacheDir);
      });

      bdd.after(function() {
        return rm(cacheDir);
      });

      bdd.it('should cache files', function() {
        // Cache our package.json file
        return cache.readJson('https://raw.githubusercontent.com/mozilla/platatus/master/package.json', cacheDir).then(function(originalText) {
          // TODO: Break fetch / disconnect internet

          // Get our package.json (should succeed from cache)
          return cache.readJson('https://raw.githubusercontent.com/mozilla/platatus/master/package.json', cacheDir).then(function(cachedText) {
            // Compare the original text with the cached text
            assert.equal(JSON.stringify(cachedText), JSON.stringify(originalText));
          });
        });
      });

      bdd.it('should reject on 404s', function() {
        return cache.readJson('https://mozilla.org/non-existent-resource', cacheDir).then(function() {
          assert.fail('`cache.readJson` should have rejected on a 404');
        }).catch(function(err) {
          assert(err instanceof Error);
          return true;
        });
      });
    });
  });
});
