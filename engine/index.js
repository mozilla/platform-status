import path from 'path';
import fs from 'fs';
import url from 'url';
import handlebars from 'handlebars';
import fetch from 'node-fetch';
import FixtureParser from './fixtureParser.js';
import BrowserParser from './browserParser.js';

const fixtureDir = path.resolve('./features');
const fixtureParser = new FixtureParser(fixtureDir);
const browserParser = new BrowserParser();

function normalizeStatus(status) {
  switch (status.trim().toLowerCase()) {
  case '':
  case 'no active development':
  case 'no longer pursuing':
  case 'not currently planned':
    return 'none';
  case 'deprecated':
  case 'removed':
    return 'deprecated';
  case 'under consideration':
    return 'under-consideration';
  case 'in development':
  case 'behind a flag':
  case 'proposed': // ?
  case 'prototyping': // ?
    return 'in-development';
  case 'shipped':
  case 'enabled by default':
  case 'done':
  case 'partial support':
  case 'preview release': // ?
  case 'prefixed': // ?
    return 'shipped';
  default:
    throw new Error('Unmapped status: ' + status);
  }
}

class BrowserFeature {
  constructor(data) {
    this.data = data;
  }

  get status() {
    return normalizeStatus(this._rawStatus);
  }
}

class ChromeBrowserFeature extends BrowserFeature {
  get _rawStatus() {
    return this.data.impl_status_chrome;
  }
  get url() {
    return url.format({
      host: 'www.chromestatus.com',
      pathname: '/feature/' + this.data.id,
      protocol: 'https:',
    });
  }
}

class WebKitBrowserFeature extends BrowserFeature {
  get _rawStatus() {
    return this.data.status ? this.data.status.status : '';
  }
  get url() {
    return url.format({
      host: 'www.webkit.org',
      pathname: '/status.html',
      hash: '#' + this.data.type + '-' + this.data.name,
      protocol: 'https:',
    });
  }
}

class IEBrowserFeature extends BrowserFeature {
  get _rawStatus() {
    return this.data.ieStatus.text;
  }
  get url() {
    return url.format({
      host: 'dev.modern.ie',
      pathname: '/platform/status/' + this.data.name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase(),
      protocol: 'https:',
    });
  }
}

const allBrowserFeatures = [
  ['chrome', ChromeBrowserFeature],
  ['webkit', WebKitBrowserFeature],
  ['ie', IEBrowserFeature],
];

function populateBrowserFeatureData(browserData, features) {
  features.forEach((feature) => {
    allBrowserFeatures.map(([key, BrowserFeatureConstructor]) => {
      const browserFeatureData = browserData[key].get(feature[key + '_ref']);
      feature[key + '_status'] = 'none';
      if (browserFeatureData) {
        const browserFeature = new BrowserFeatureConstructor(browserFeatureData);
        feature[key + '_status'] = browserFeature.status;
        feature[key + '_url'] = browserFeature.url;
      } else {
        console.log('WARNING: Missing cross ref to "' + feature.title + '" for browser "' + key + '"');
      }
    });
  });
}

function populateSpecStatus(browserData, features) {
  features.forEach((feature) => {
    const browserFeatureData = browserData.chrome.get(feature.chrome_ref);
    if (!browserFeatureData.standardization) {
      return;
    }
    let normalized;
    const status = browserFeatureData.standardization.text;
    switch (status) {
    case 'De-facto standard':
      normalized = 'de-facto-standard';
      break;
    case 'Editor\'s draft':
      normalized = 'editors-draft';
      break;
    case 'Established standard':
      normalized = 'established-standard';
      break;
    case 'No public standards discussion':
      normalized = 'no-public-discussion';
      break;
    case 'Public discussion':
      normalized = 'public-discussion';
      break;
    case 'Working draft or equivalent':
      normalized = 'working-draft-or-equivalent';
      break;
    default:
      throw new Error('Unmapped standardization status: ' + status);
    }
    feature.standardization = normalized;
  });
}

function populateBugzillaData(features) {
  return Promise.all(features.map((feature) => {
    if (!feature.bugzilla) {
      return null;
    }
    return fetch('https://bugzilla.mozilla.org/rest/bug?id=' + feature.bugzilla)
      .then((response) => {
        return response.json();
      }).then((json) => {
        feature.bugzilla_status = json.bugs[0].status;
      });
  }));
}

function buildIndex(data) {
  const templateContents = fs.readFileSync('src/tpl/index.html');
  return handlebars.compile(String(templateContents))(data);
}

function build(options) {
  return Promise.all([
    fixtureParser.read(),
    browserParser.read(options),
  ]).then(() => {
    return populateBugzillaData(fixtureParser.results);
  }).then(() => {
    populateBrowserFeatureData(browserParser.results, fixtureParser.results);
    populateSpecStatus(browserParser.results, fixtureParser.results);
    return {
      'index.html': buildIndex({ features: fixtureParser.results }),
    };
  }).catch((err) => {
    console.error(err);
  });
}

export default build;
