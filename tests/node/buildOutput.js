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

      // Please keep this list alphabetically sorted and lowercase
      var expectedFiles = [ 'bundle.css', 'bundle.css.map', 'bundle.js', 'bundle.js.map', 'index.html'];

      return new Promise(function (resolve, reject) {
        fs.readdir('dist', function (err, files) {
          if (err) {
            reject(err);
            return;
          }

          var promises = files.map(processExistingFile);

          return Promise.all(promises).then(function () {
            if (expectedFiles.length !== 0) {
              reject(new Error('File(s) not found: ' + expectedFiles));
              return;
            }

            resolve();
          }).catch(reject);
        });
      });

      function processExistingFile(filename) {
        var index = expectedFiles.indexOf(filename.toLowerCase());
        if (index === -1) {
          return Promise.reject(new Error('Unexpected file: ' + filename));
        }
        expectedFiles.splice(index, 1);

        var p1 = new Promise(function (resolve, reject) {
          fs.access('dist/index.html', fs.F_OK | fs.R_OK, function (err) {
            if (err) {
              reject(err);
              return;
            }

            resolve();
          });
        });

        var p2 = new Promise(function (resolve, reject) {
          fs.stat('dist/index.html', function(err, stats) {
            if (err) {
              reject(err);
              return;
            }

            if (!stats.isFile()) {
              reject(new Error(filename + ' is not a file'));
              return;
            }

            resolve();
          });
        });

        return Promise.all([p1, p2]);
      }
    });
  });
});
