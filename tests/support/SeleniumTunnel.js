/* vim: set filetype=javascript sw=2 tw=80 : */
/* eslint-disable guard-for-in */

/**
 * This module defines a tunnel that is used by Intern to
 * interact with the Selenium standalone JAR.
 *
 * It implements the `Tunnel` interface defined here:
 *     https://theintern.github.io/digdug/Tunnel.html
 *
 *  TODO: Emit events when interesting things happen
 *    downloadprogres
 *    status
 *    stderr
 *    stdout
 */

define(function(require) {
  var childProcess = require('intern/dojo/node!child_process');
  var fs = require('intern/dojo/node!fs');
  var https = require('intern/dojo/node!https');
  var net = require('intern/dojo/node!net');
  var path = require('intern/dojo/node!path');

  var Evented = require('intern/dojo/Evented');
  var util = require('intern/dojo/node!digdug/util.js');

  const testsVarDir = path.normalize('./tests/support/var/');
  const seleniumVersion = '2.48.2';
  const seleniumFilename = 'selenium-server-standalone-' + seleniumVersion + '.jar';
  const seleniumDownloadUrl = 'https://selenium-release.storage.googleapis.com/2.48/selenium-server-standalone-2.48.2.jar';
  const seleniumLogPath = path.join(testsVarDir, 'selenium.log');

  function maybeMkdir(dir) {
    return new Promise(function(resolve, reject) {
      // We ignore creation errors since we don't care
      // whether the directory was already there or if
      // we created it, and we're about to check its
      // existence.
      fs.mkdir(dir, function() {
        fs.stat(dir, function(err, stats) {
          if (err) {
            reject(err);
            return;
          }

          if (!stats.isDirectory()) {
            reject(new Error(dir + ' already exists and is not a directory'));
            return;
          }

          resolve();
        });
      });
    });
  }

  function SeleniumTunnel(kwArgs) {
    Evented.apply(this, arguments);
    for (var key in kwArgs) {
      Object.defineProperty(this, key, Object.getOwnPropertyDescriptor(kwArgs, key));
    }

    this.architecture = process.arch;
    this.auth = null;
    this.directory = testsVarDir;
    this.executable = seleniumFilename;
    this.hostname = 'localhost';
    this.pathname = '/wd/hub';
    this.platform = process.platform;
    this.port = 4444;
    this.protocol = 'http';
    this.proxy = null;
    this.tunnelId = null;
    this.url = seleniumDownloadUrl;
    this.verbose = false;

    this._process = null;
    this._isRunning = false;
    this._isStarting = false;
    this._isStopping = false;
  }

  const _super = Evented.prototype;
  SeleniumTunnel.prototype = util.mixin(Object.create(_super), {
    get clientUrl() {
      return this.protocol + '://' + this.hostname + ':' + this.port + this.pathname;
    },
    get extraCapabilities() {
      return {};
    },
    get isDownloaded() {
      try {
        fs.accessSync(path.join(this.directory, this.executable), fs.F_OK);
        return true;
      } catch (ex) {
        return false;
      }
    },
    get isRunning() {
      return this._isRunning;
    },
    get isStarting() {
      return this._isStarting;
    },
    get isStopping() {
      return this._isStopping;
    },
    download: function(forceDownload) {
      var that = this;

      var filePath = path.join(that.directory, that.executable);

      if (that.isDownloaded && !forceDownload) {
        return Promise.resolve();
      }

      return new Promise(function(resolve, reject) {
        maybeMkdir(testsVarDir).then(function() {
          const file = fs.createWriteStream(filePath);
          const request = https.get(that.url, function(response) {
            response.pipe(file);
            file.on('finish', resolve);
          });

          request.on('error', function(reqErr) { // Handle errors
            fs.unlink(filePath); // Delete the file async. (But we don't check the result)
            reject(reqErr);
          });
        });
      });
    },
    sendJobState: function() {
      return Promise.resolve();
    },
    start: function() {
      var that = this;

      var filePath = path.join(that.directory, that.executable);

      return new Promise(function(resolve, reject) {
        that.download(false).then(function() {
          that._isStarting = true;
          fs.open(seleniumLogPath, 'w', function(err, fd) {
            if (err) {
              that._isStarting = false;
              return reject(err);
            }

            that._process = childProcess.spawn('java', ['-jar', filePath], { stdio: [fd, fd, fd] });

            function waitUntilRunning() {
              var socket = new net.Socket();

              socket.on('connect', function() {
                socket.end();
                that._isStarting = false;
                that._isRunning = true;
                return resolve();
              });

              // TODO: Only try to connect for some specified amount of time
              socket.on('error', function() {
                setTimeout(waitUntilRunning, 500);
              });

              socket.connect({port: that.port});
            }

            return waitUntilRunning();
          });
        });
      });
    },
    stop: function() {
      var that = this;

      that._isRunning = false;
      that._isStopping = true;

      return new Promise(function(resolve) {
        that._process.on('exit', function() {
          that._process = null;
          that._isStopping = false;
          return resolve(0);
        });

        that._process.kill('SIGINT');
      });
    },
  });

  return SeleniumTunnel;
});
