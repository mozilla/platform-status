import browserify from 'browserify';
import babelify from 'babelify';
import fs from 'fs';
import del from 'del';
import source from 'vinyl-source-stream';
import buffer from 'vinyl-buffer';
import gulp from 'gulp';
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

gulp.task('clean', (done) => {
  del(['./dist']).then(() => {
    done();
  });
});

gulp.task('lint', () => {
  return gulp
    .src(['./*.js', './engine/*.js', './src/*.js'])
    .pipe(plugins.eslint())
    .pipe(plugins.eslint.format());
});

gulp.task('test', ['lint']);

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

gulp.task('build', ['build:root', 'build:engine', 'build:js', 'build:css']);

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
