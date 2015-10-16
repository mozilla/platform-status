var expect = require('chai').expect;
var fs = require('fs');

describe('Build process', function() {
  before(function () {
  });

  it('should output readable expected files and only expected files', function (done) {
    // Please keep this list alphabetically sorted and lowercase
    let expectedFiles = [ 'bundle.css', 'bundle.css.map', 'bundle.js', 'bundle.js.map', 'index.html'];

    fs.readdir('dist', function (err, files) {
      if (err) {
        done(err);
      }

      let promises = [];
      files.forEach(function (filename) {
        promises.push(processExistingFile(filename));
      });

      Promise.all(promises).then(function () {
        if (0 !== expectedFiles.length) {
          throw new Error('File(s) not found: ' + expectedFiles);
        }

        done();
      }).catch(function (err) {
        done(err);
      });
    });

    function processExistingFile(filename) {
      let index = expectedFiles.indexOf(filename.toLowerCase());
      if (-1 === index) {
        return Promise.reject(new Error('Unexpected file: ' + filename));
      }
      expectedFiles.splice(index, 1);

      let p1 = new Promise(function (resolve, reject) {
        fs.access('dist/index.html', fs.F_OK | fs.R_OK, function (err) {
          if (err) {
            throw err;
          }

          resolve();
        });
      });

      let p2 = new Promise(function (resolve, reject) {
        fs.stat('dist/index.html', function(err, stats) {
          if (err) {
            throw err;
          }

          if (!stats.isFile()) {
            throw new Error(filename + ' is not a file');
          }

          resolve();
        });
      });

      return Promise.all([p1, p2]);
    }
  });

  after(function () {
  });
});
