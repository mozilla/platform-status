/* vim: set filetype=javascript sw=2 tw=80 : */

define([
  // This file uses BDD style. Other styles are available
  'intern!bdd',
  // This file uses the chai assert library. Other libraries available.
  'intern/chai!assert',
  // This is how to load regular Node modules.
  'intern/dojo/node!fs',
], function (bdd, assert, fs) {
  bdd.describe('Build process', function() {
    bdd.before(function () {
      // executes before test suite starts
    });

    bdd.after(function () {
      // executes after test suite ends
    });

    bdd.beforeEach(function () {
      // executes before each test
    });

    bdd.afterEach(function () {
      // executes after each test
    });

    bdd.it('should output readable expected files and only expected files', function () {
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
        'dist/fonts/OpenSans-Bold-webfont.woff',
        'dist/fonts/OpenSans-BoldItalic-webfont.woff',
        'dist/fonts/OpenSans-ExtraBold-webfont.woff',
        'dist/fonts/OpenSans-ExtraBoldItalic-webfont.woff',
        'dist/fonts/OpenSans-Italic-webfont.woff',
        'dist/fonts/OpenSans-Light-webfont.woff',
        'dist/fonts/OpenSans-LightItalic-webfont.woff',
        'dist/fonts/OpenSans-Regular-webfont.woff',
        'dist/fonts/OpenSans-Semibold-webfont.woff',
        'dist/fonts/OpenSans-SemiboldItalic-webfont.woff',
        'dist/index.html',
        'dist/offline-worker.js'
      ];

      return processPath('dist').then(function () {
        if (expectedFiles.length !== 0) {
          throw new Error('File(s) not found: ' + expectedFiles);
        }
      });

      function processPath(path) {
        return new Promise(function (resolve, reject) {
          fs.stat(path, function(err, stats) {
            if (err) {
              return reject(path + ': ' + err);
            }

            if (stats.isFile()) {
              return fs.access(path, fs.F_OK | fs.R_OK, function (err) {
                if (err) {
                  return reject(path + ': ' + err);
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
              var promises = [];
              return fs.readdir(path, function (err, files) {
                if (err) {
                  return reject(path + ': ' + err);
                }

                files.forEach(function (filename) {
                  var filepath = path + '/' + filename;
                  var p = processPath(filepath)
                  promises.push(p);
                });

                return Promise.all(promises).then(resolve).catch(reject);
              });
            }

            return reject(path + ' is not a file or a directory');
          });
        });
      }
    });
  });
});
