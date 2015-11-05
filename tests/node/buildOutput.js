
define([
  // This file uses BDD style. Other styles are available
  'intern!bdd',
  // This file uses the chai assert library. Other libraries available.
  'intern/chai!assert',
  // This is how to load regular Node modules.
  'intern/dojo/node!fs',
], function(bdd, assert, fs) {
  bdd.describe('Build process', function() {
    bdd.before(function() {
      // executes before test suite starts
    });

    bdd.after(function() {
      // executes after test suite ends
    });

    bdd.beforeEach(function() {
      // executes before each test
    });

    bdd.afterEach(function() {
      // executes after each test
    });

    bdd.it('should output readable expected files and only expected files', function() {
      // Don't throw an error and the test will pass
      // throw new Error('This will cause the test to fail');
      //
      // Return a Promise for async tests. If the promise eventually
      // resolves, the test passes. If the promise eventually
      // rejects, the test fails.
      //
      // `this` refers to a test suite object. You can use it to
      // skip the test or do other test-specific things.
      //
      // `this.remote` is how we control the test browser for functional
      // tests. It will be null for unit tests.

      // Actual test starts here

      // Please keep this list alphabetically sorted. It is case sensitive.
      var expectedFiles = [
        'dist/bundle.css',
        'dist/bundle.css.map',
        'dist/bundle.js',
        'dist/bundle.js.map',
        'dist/cache/httpsrawgithubusercontentcommicrosoftedgestatusproductionappstaticiestatus.json',
        'dist/cache/httpssvnmozillaorglibsproductdetailsjsonfirefoxversions.json',
        'dist/cache/httpssvnwebkitorgrepositorywebkittrunksourcejavascriptcorefeatures.json',
        'dist/cache/httpssvnwebkitorgrepositorywebkittrunksourcewebcorefeatures.json',
        'dist/cache/httpswwwchromestatuscomfeatures.json',
        'dist/images/bugzilla.png',
        'dist/images/bugzilla@2x.png',
        'dist/images/favicon-196.png',
        'dist/images/favicon.ico',
        'dist/images/github.png',
        'dist/images/github@2x.png',
        'dist/images/html5.png',
        'dist/images/html5@2x.png',
        'dist/images/ios-icon-180.png',
        'dist/images/mdn.png',
        'dist/images/mdn@2x.png',
        'dist/images/tabzilla-static.png',
        'dist/images/tabzilla-static-high-res.png',
        'dist/index.html',
        'dist/manifest.json',
        'dist/offline-worker.js',
        'dist/status.json'
      ];

      function processPath(path) {
        return new Promise(function(resolve, reject) {
          fs.stat(path, function(statErr, stats) {
            if (statErr) {
              return reject(path + ': ' + statErr);
            }

            if (stats.isFile()) {
              return fs.access(path, fs.F_OK | fs.R_OK, function(accessErr) {
                if (accessErr) {
                  return reject(path + ': ' + accessErr);
                }

                var index = expectedFiles.indexOf(path);
                if (index === -1) {
                  return reject(new Error('Unexpected file: ' + path));
                }
                expectedFiles.splice(index, 1);

                return resolve();
              });
            }

            if (stats.isDirectory()) {
              return fs.readdir(path, function(readErr, files) {
                if (readErr) {
                  return reject(path + ': ' + readErr);
                }

                var promises = files.map(function(filename) {
                  var filepath = path + '/' + filename;
                  return processPath(filepath);
                });

                return Promise.all(promises)
                  .then(resolve)
                  .catch(reject);
              });
            }

            return reject(path + ' is not a file or a directory');
          });
        });
      }

      return processPath('dist').then(function() {
        if (expectedFiles.length !== 0) {
          throw new Error('File(s) not found: ' + expectedFiles);
        }
      });
    });
  });
});
