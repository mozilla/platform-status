import path from 'path';
import fs from 'fs';
import handlebars from 'handlebars';
import FixtureParser from './fixtureParser.js';
import BrowserParser from './browserParser.js';

const fixtureDir = path.resolve('./features');
const fixtureParser = new FixtureParser(fixtureDir);
const browserParser = new BrowserParser();


function buildIndex(data) {
  var templateContents = fs.readFileSync('src/tpl/index.html');
  return handlebars.compile(String(templateContents.contents))(data);
}


function build() {
  return Promise.all([
    fixtureParser.read(),
    browserParser.read(),
  ]).then(() => {
    return {
      'index.html' : buildIndex({ features: fixtureParser.results })
    };
  }).catch((err) => {
    console.error(err);
  });
}

export default build;
