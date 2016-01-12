define(function(require) {
  const bdd = require('intern!bdd');
  const assert = require('intern/chai!assert');

  // This is how to load regular Node modules.
  const fs = require('intern/dojo/node!fs');

  // Create a sub-suite with `bdd.describe`. Sub-suites can
  // have their own sub-suites; just use `bdd.describe`
  // within a suite.
  //
  // Use `bdd.before` to define a function that will
  // run before the suite starts, `bdd.after` to define a
  // function that will run after the suite ends, `bdd.beforeEach`
  // to define a function that will run before each test or sub-suite,
  // and `bdd.afterEach` to define a function that will run after each
  // test or sub-suite.
  //
  // Use `bdd.it` to define actual test cases.
  //
  // Within a test, throwing an `Error` object will cause the test to fail.
  // Returning a promise will make the test async; if the promise
  // eventually resolves then the test will pass. If the promise
  // eventually rejects then the test will fail. Reject with a descriptive
  // `Error` object please.
  //
  // Within a test, `this` refers to a test suite object. You can use it
  // to skip the test or do other test-specific things.
  //
  // `this.remote` is null for unit tests.

  const publicDir = 'dist/public';

  bdd.describe('Node unit', function() {
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
          'dist/public/status.json',
          'dist/public/app-manifest.html',
          'dist/public/permissions_revoke.html',
          'dist/public/permissions_request.html',
          'dist/public/asmjs.html',
          'dist/public/pointerlock.html',
          'dist/public/background-sync.html',
          'dist/public/promise.html',
          'dist/public/canvas-media-capture.html',
          'dist/public/push.html',
          'dist/public/css-variables.html',
          'dist/public/screen-orientation.html',
          'dist/public/custom-elements.html',
          'dist/public/service-worker.html',
          'dist/public/device-orientation.html',
          'dist/public/shadow-dom.html',
          'dist/public/fetch.html',
          'dist/public/shared-worker.html',
          'dist/public/fullscreen.html',
          'dist/public/shared_array_buffer.html',
          'dist/public/gamepad.html',
          'dist/public/streams.html',
          'dist/public/html-imports.html',
          'dist/public/vibration.html',
          'dist/public/html-templates.html',
          'dist/public/web-assembly.html',
          'dist/public/htmlcanvaselement-toblob.html',
          'dist/public/web-bluetooth.html',
          'dist/public/webaudio.html',
          'dist/public/indexeddb.html',
          'dist/public/webgl-1.html',
          'dist/public/media-recorder.html',
          'dist/public/webgl-2.html',
          'dist/public/mse.html',
          'dist/public/webrtc.html',
          'dist/public/page-visibility.html',
          'dist/public/websocket.html',
          'dist/public/permissions.html',
          'dist/public/webspeech-synthesis.html'
        ];

        var ignoreDirs = [
        ];

        function processPath(path) {
          return new Promise(function(resolve, reject) {
            if (ignoreDirs.indexOf(path) > -1) {
              resolve();
            }
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

        return processPath(publicDir).then(function() {
          if (expectedFiles.length !== 0) {
            throw new Error('File(s) not found: ' + expectedFiles);
          }
        });
      });
    });

    bdd.describe('Engine', function() {
      bdd.before(function() {
        // This modifies the node module loader to work with es2015 modules.
        // All subsequent `require` calls that use the node module loader
        // will use this modified version and will be able to load es2015
        // modules.
        require('intern/dojo/node!babel-core/register');
      });

      bdd.describe('fixtureParser', function() {
        bdd.it('should something', function() {
          // The node module loader for some reason has wacky path resolution.
          // I wish we didn't have to have all these '..' but, alas.
          var FixtureParser = require('intern/dojo/node!../../../../engine/fixtureParser').default;
          var fp = new FixtureParser('asdf');
          assert(fp);
        });
      });
    });
  });
});
