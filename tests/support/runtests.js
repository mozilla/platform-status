const childProcess = require('child_process');
const fs = require('fs');
const https = require('https');

const testsVarDir = 'tests/support/var/';
const seleniumVersion = '2.48.2';
const seleniumFilename = 'selenium-server-standalone-' + seleniumVersion + '.jar';
const seleniumPath = testsVarDir + seleniumFilename;
const seleniumDownloadUrl = 'https://selenium-release.storage.googleapis.com/2.48/selenium-server-standalone-2.48.2.jar';
const seleniumLogPath = testsVarDir + 'selenium.log';


const nodeTestsProcess = childProcess.spawn('./node_modules/intern/bin/intern-client.js', ['config=tests/intern-node'], { stdio: 'inherit' });
nodeTestsProcess.once('exit', function(exitCode) {
  if (exitCode !== 0) {
    process.exit(1);
  }
});

function maybeMkdir(path) {
  return new Promise(function(resolve, reject) {
    // We ignore creation errors since we don't care
    // whether the directory was already there or if
    // we created it, and we're about to check its
    // existence.
    fs.mkdir(path, function() {
      fs.stat(path, function(err, stats) {
        if (err) {
          reject(err);
          return;
        }

        if (!stats.isDirectory()) {
          reject(new Error(path + ' already exists and is not a directory'));
          return;
        }

        resolve();
      });
    });
  });
}

function ensureSelenium() {
  return new Promise(function(resolve, reject) {
    // Check for selenium server JAR
    fs.access(seleniumPath, fs.R_OK, function(accessErr) {
      if (!accessErr) {
        console.log('Using existing Selenium server JAR');
        resolve();
        return;
      }

      console.log('No Selenium server JAR found');
      // Download Selenium if not found
      maybeMkdir(testsVarDir).then(function() {
        const file = fs.createWriteStream(seleniumPath);
        const request = https.get(seleniumDownloadUrl, function(response) {
          console.log('Downloading Selenium server JAR');
          response.pipe(file);
          file.on('finish', resolve);
        });

        request.on('error', function(reqErr) { // Handle errors
          fs.unlink(seleniumPath); // Delete the file async. (But we don't check the result)
          reject(reqErr);
        });
      });
    });
  });
}

ensureSelenium().then(function() {
  fs.open(seleniumLogPath, 'w', function(err, fd) {
    if (err) {
      process.exit(1);
    }

    const seleniumProcess = childProcess.spawn('java', ['-jar', seleniumPath], { stdio: [fd, fd, fd] });

    // Wait 3s after starting the Selenium server to give it time
    // to start accepting connections
    setTimeout(function() {
      const browserTestsProcess = childProcess.spawn('./node_modules/intern/bin/intern-runner.js', ['config=tests/intern-browser'], { stdio: 'inherit' });
      browserTestsProcess.once('exit', function(exitCode) {
        seleniumProcess.kill('SIGINT');
        if (exitCode !== 0) {
          process.exit(1);
        }
      });
    }, 3000);
  });
});
