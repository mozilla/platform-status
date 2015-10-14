import path from 'path';
import FixtureParser from './fixtureParser.js';
import BrowserParser from './browserParser.js';

const fixtureDir = path.resolve('./features');
const fixtureParser = new FixtureParser(fixtureDir);
const browserParser = new BrowserParser();

function build() {
  return Promise.all([
    fixtureParser.read(),
    browserParser.read(),
  ]).then(() => {
    console.log(fixtureParser.results);
    console.log(browserParser.results);
  }).catch((err) => {
    console.error(err);
  });
}

export default build;
