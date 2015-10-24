import browserify from 'browserify';
import babelify from 'babelify';
import fs from 'fs';
import path from 'path';
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
import mkdirp from 'mkdirp';

import babelRegister from 'babel-core/register';
babelRegister();
import sourceMapSupport from 'source-map-support';
sourceMapSupport.install();

import browserSyncCreator from 'browser-sync';
const browserSync = browserSyncCreator.create();

import engine from './engine/index.js';

gulp.task('clean', () => {
  return del(['./dist']);
});

gulp.task('lint', () => {
  return gulp
    .src(['./*.js', './engine/*.js', './src/*.js'])
    .pipe(plugins.eslint())
    .pipe(plugins.eslint.format())
    .pipe(plugins.eslint.failOnError());
});

gulp.task('test:node', () => {
  return new Promise((resolve) => {
    const child = childProcess.spawn('./node_modules/intern/bin/intern-client.js', ['config=tests/intern-node'], { stdio: 'inherit' });
    child.once('exit', resolve);
  });
});

gulp.task('test:browser', () => {
  // TODO: Choose a standard place for server JAR to reside
  // TODO: Check for selenium server JAR
  // TODO: Maybe download selenium if not found

  let server;
  return new Promise((resolve) => {
    // TODO: Choose a better place for logs
    fs.open('selenium.log', 'w', (err, fd) => {
      // TODO: Error handling

      server = childProcess.spawn('java', ['-jar', 'selenium-server-standalone.jar'], { stdio: [fd, fd, fd] });

      // Wait 1s after starting the server before starting the client
      // to allow it time to get ready to accept incoming connections
      setTimeout(() => {
        const child = childProcess.spawn('./node_modules/intern/bin/intern-runner.js', ['config=tests/intern-browser'], { stdio: 'inherit' });
        child.once('exit', resolve);
      }, 1000);
    });
  }).then(() => {
    server.kill('SIGINT');
  });
});

gulp.task('test', ['lint', 'test:node', 'test:browser']);

gulp.task('deploy', ['build'], () => {
  return oghliner.deploy({
    rootDir: 'dist',
  });
});

gulp.task('build:engine', () => {
  const cacheDir = path.join('./dist', 'cache');
  mkdirp.sync(cacheDir);
  const options = {
    cacheDir: cacheDir,
  };
  return engine(options).then((files) => {
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
