import browserify from 'browserify';
import babelify from 'babelify';
import fs from 'fs';
import del from 'del';
import source from 'vinyl-source-stream';
import buffer from 'vinyl-buffer';
import gulp from 'gulp';
import childProcess from 'child_process';
import oghliner from 'oghliner';
import loadPlugins from 'gulp-load-plugins';
const plugins = loadPlugins({
  lazy: false,
});
import cssnext from 'postcss-cssnext';
import postImport from 'postcss-import';
import autoprefixer from 'autoprefixer';
import cssMqpacker from 'css-mqpacker';

import babelRegister from 'babel-core/register';
babelRegister();
import sourceMapSupport from 'source-map-support';
sourceMapSupport.install();

import browserSyncCreator from 'browser-sync';
const browserSync = browserSyncCreator.create();

import engine from './engine/index.js';

import https from 'https';

const testsVarDir = 'tests/support/var/';
const seleniumVersion = '2.48.2';
const seleniumFilename = 'selenium-server-standalone-' + seleniumVersion + '.jar';
const seleniumPath = testsVarDir + seleniumFilename;
const seleniumDownloadUrl = 'https://selenium-release.storage.googleapis.com/2.48/selenium-server-standalone-2.48.2.jar';
const seleniumLogPath = testsVarDir + 'selenium.log';


gulp.task('clean', () => {
  return del(['./dist']);
});

gulp.task('lint', () => {
  return gulp
    .src(['./*.js', './engine/*.js', './src/*.js'])
    .pipe(plugins.eslint())
    .pipe(plugins.eslint.format());
});

gulp.task('test:node', () => {
  return new Promise((resolve, reject) => {
    const child = childProcess.spawn('./node_modules/intern/bin/intern-client.js', ['config=tests/intern-node'], { stdio: 'inherit' });
    child.once('exit', (exitCode) => {
      if (exitCode !== 0) {
        reject();
      } else {
        resolve();
      }
    });
  });
});

function maybeMkdir(path) {
  return new Promise((resolve, reject) => {
    // We ignore creation errors since we don't care
    // whether the directory was already there or if
    // we created it, and we're about to check its
    // existence.
    fs.mkdir(path, () => {
      fs.stat(path, (err, stats) => {
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
  return new Promise((resolve, reject) => {
    // Check for selenium server JAR
    fs.access(seleniumPath, fs.R_OK, (accessErr) => {
      if (!accessErr) {
        console.log('Using existing Selenium server JAR');
        resolve();
        return;
      }

      console.log('No Selenium server JAR found');
      // Download Selenium if not found
      maybeMkdir(testsVarDir).then(() => {
        const file = fs.createWriteStream(seleniumPath);
        const request = https.get(seleniumDownloadUrl, (response) => {
          console.log('Downloading Selenium server JAR');
          response.pipe(file);
          file.on('finish', resolve);
        });

        request.on('error', (reqErr) => { // Handle errors
          fs.unlink(seleniumPath); // Delete the file async. (But we don't check the result)
          reject(reqErr);
        });
      });
    });
  });
}

gulp.task('test:browser', ['build'], () => {
  return ensureSelenium().then(() => {
    return new Promise((resolve, reject) => {
      fs.open(seleniumLogPath, 'w', (err, fd) => {
        if (err) {
          reject(err);
          return;
        }

        const server = childProcess.spawn('java', ['-jar', seleniumPath], { stdio: [fd, fd, fd] });

        // Wait 1s after starting the Selenium server to give it time
        // to start accepting connections
        setTimeout(() => {
          const child = childProcess.spawn('./node_modules/intern/bin/intern-runner.js', ['config=tests/intern-browser'], { stdio: 'inherit' });
          child.once('exit', (exitCode) => {
            server.kill('SIGINT');
            if (exitCode !== 0) {
              reject();
            } else {
              resolve();
            }
          });
        }, 1000);
      });
    });
  });
});

gulp.task('test', ['lint', 'test:node', 'test:browser']);

gulp.task('deploy', ['build'], () => {
  return oghliner.deploy({
    rootDir: 'dist',
  });
});

gulp.task('build:engine', () => {
  return engine().then((files) => {
    for (const filename of Object.keys(files)) {
      fs.writeFileSync('./dist/' + filename, files[filename]);
    }
  });
});

gulp.task('build:root', () => {
  return gulp
    .src('./src/*.*')
    .pipe(gulp.dest('./dist'));
});

gulp.task('build:js', () => {
  return browserify({
    entries: './src/js/index.js',
    debug: true,
  })
  .transform(babelify.configure())
  .bundle()
  .pipe(source('bundle.js'))
  .pipe(buffer())
  .pipe(plugins.sourcemaps.init({
    loadMaps: true,
  }))
  .pipe(plugins.sourcemaps.write('.'))
  .pipe(gulp.dest('./dist'));
});

gulp.task('build:css', () => {
  const processors = [
    postImport({
      browers: ['last 1 version'],
    }),
    cssnext(),
    autoprefixer({
      browers: ['last 1 version'],
    }),
    cssMqpacker(),
  ];
  return gulp
    .src('./src/css/*.css')
    .pipe(plugins.sourcemaps.init())
    .pipe(plugins.postcss(processors))
    .pipe(plugins.concat('bundle.css'))
    .pipe(plugins.sourcemaps.write('.'))
    .pipe(gulp.dest('./dist'));
});

gulp.task('build', ['build:root', 'build:engine', 'build:js', 'build:css'], () => {
  return oghliner.offline({
    rootDir: 'dist/',
    fileGlobs: [
      'index.html',
      '*.js',
      '*.css',
    ],
  });
});

gulp.task('watch', ['build'], () => {
  browserSync.init({
    open: false,
    server: {
      baseDir: './dist',
    },
  });
  gulp.watch(['./src/*.*'], ['build:root']);
  gulp.watch(['./src/css/*.css'], ['build:css']);
  gulp.watch(['./src/js/*.js'], ['build:js']);
  gulp.watch(['./engine/*.js', './features/*.md', './src/tpl/*.html'], ['build:engine']);
  gulp.watch(['./dist/**/*.*'], browserSync.reload);
});

gulp.task('default', ['build']);
