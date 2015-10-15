import gulp from 'gulp';
import hb from 'gulp-hb';
import path from 'path';
import FixtureParser from './fixtureParser.js';
import BrowserParser from './browserParser.js';

const fixtureDir = path.resolve('./features');
const fixtureParser = new FixtureParser(fixtureDir);
const browserParser = new BrowserParser();


function buildIndex(data) {
  return new Promise((resolve, reject) => {
    gulp.src('src/tpl/*.html')
      .pipe(hb({
        data: data,
      }))
      .pipe(gulp.dest('./dist/'))
      .on('error', reject)
      .on('finished', resolve);
  })
}


function build() {
  return Promise.all([
    fixtureParser.read(),
    browserParser.read(),
  ]).then(() => {
    return buildIndex({ features: fixtureParser.results });
  }).catch((err) => {
    console.error(err);
  });
}

export default build;
