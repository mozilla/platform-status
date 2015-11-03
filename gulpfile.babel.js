import browserify from 'browserify';
import babelify from 'babelify';
import fs from 'fs';
import path from 'path';
import del from 'del';
import source from 'vinyl-source-stream';
import buffer from 'vinyl-buffer';
import gulp from 'gulp';
import debounce from 'lodash.debounce';
import oghliner from 'oghliner';
import loadPlugins from 'gulp-load-plugins';
const plugins = loadPlugins({
  lazy: false,
});
import cssnext from 'postcss-cssnext';
import cssImport from 'postcss-import';
import autoprefixer from 'autoprefixer';
import cssMqpacker from 'css-mqpacker';
import cssNested from 'postcss-nested';
import cssExtend from 'postcss-simple-extend';
import cssSimpleVars from 'postcss-simple-vars';
import cssReporter from 'postcss-reporter';
import mkdirp from 'mkdirp';

import babelRegister from 'babel-core/register';
babelRegister();
import sourceMapSupport from 'source-map-support';
sourceMapSupport.install();

import browserSyncCreator from 'browser-sync';
const browserSync = browserSyncCreator.create();
const statusFilename = './dist/status.json';

import engine from './engine/index.js';

gulp.task('clean', () => {
  return del(['./dist']);
});

gulp.task('lint', () => {
  return gulp
    .src(['./*.js', './engine/*.js', './src/*.js', './tests/**/*.js'])
    .pipe(plugins.eslint())
    .pipe(plugins.eslint.format())
    .pipe(plugins.eslint.failOnError());
});

gulp.task('deploy', ['build'], () => {
  return oghliner.deploy({
    rootDir: 'dist',
  });
});

gulp.task('build:status', () => {
  const cacheDir = path.join('./dist', 'cache');
  mkdirp.sync(cacheDir);
  const options = {
    cacheDir: cacheDir,
  };
  return engine.buildStatus(options).then((status) => {
    fs.writeFileSync(statusFilename, JSON.stringify(status, null, 2));
  });
});

gulp.task('build:index', ['build:status'], () => {
  const status = JSON.parse(fs.readFileSync(statusFilename));
  return engine.buildIndex(status).then((contents) => {
    fs.writeFileSync(path.join('./dist', 'index.html'), contents);
  });
});

gulp.task('build:tabzilla', () => {
  return gulp
    .src(
      ['./node_modules/mozilla-tabzilla/**/*.png'],
      {base: './node_modules/mozilla-tabzilla'}
    )
    .pipe(gulp.dest('./dist'));
  });

gulp.task('build:root', () => {
  return gulp
    .src(
      ['./src/*.*', './src/fonts/*.*', './src/images/*.*'],
      {base: './src'}
    )
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
    cssImport(),
    cssExtend(),
    cssNested(),
    cssSimpleVars(),
    cssnext({
      browers: ['last 1 version'],
    }),
    autoprefixer({
      browers: ['last 1 version'],
    }),
    cssMqpacker(),
    // cssReporter(),
  ];
  return gulp
    .src('./src/css/*.css')
    .pipe(plugins.sourcemaps.init())
    .pipe(plugins.postcss(processors))
    .pipe(plugins.concat('bundle.css'))
    .pipe(plugins.sourcemaps.write('.'))
    .pipe(gulp.dest('./dist'));
});

gulp.task('build:dist', ['build:root', 'build:tabzilla', 'build:status', 'build:index', 'build:js', 'build:css']);

function offline() {
  return oghliner.offline({
    rootDir: 'dist/',
    fileGlobs: [
      'index.html',
      '*.js',
      '*.css',
    ],
  });
}

gulp.task('build', ['build:dist'], offline);

gulp.task('watch', ['build'], () => {
  browserSync.init({
    open: false,
    server: {
      baseDir: './dist',
      ghostMode: false,
      notify: false,
    },
  });
  gulp.watch(['./src/*.*'], ['build:root']);
  gulp.watch(['./src/css/**/*.css'], ['build:css']);
  gulp.watch(['./src/js/*.js'], ['build:js']);
  gulp.watch(['./engine/*.js', './features/*.md', './src/tpl/*.html'], ['build:index']);
  gulp.watch(['./dist/**/*.*', '!./dist/offline-worker.js'], debounce(offline, 200));
  gulp.watch(['./dist/offline-worker.js'], browserSync.reload);
});

gulp.task('default', ['build']);
