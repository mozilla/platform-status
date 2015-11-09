import path from 'path';
import fs from 'fs';
import url from 'url';
import handlebars from 'handlebars';
import fetch from 'node-fetch';
import Bottleneck from 'bottleneck';
import FixtureParser from './fixtureParser.js';
import BrowserParser from './browserParser.js';
import FirefoxVersionParser from './firefoxVersionParser.js';

const fixtureDir = path.resolve('./features');
const fixtureParser = new FixtureParser(fixtureDir);
const browserParser = new BrowserParser();
const firefoxVersionParser = new FirefoxVersionParser();
let validationWarnings;

function validateWarning(msg) {
  validationWarnings.push(msg);
}

function normalizeStatus(status, browser) {
  switch (status.trim().toLowerCase()) {
  case '':
    return 'unknown';
  case 'no active development':
  case 'not currently planned':
    return 'not-planned';
  case 'deprecated':
  case 'no longer pursuing':
  case 'removed':
    return 'deprecated';
  case 'under consideration':
  case 'proposed':
    return 'under-consideration';
  case 'in development':
  case 'behind a flag':
  case 'prototyping':
  case 'preview release':
    return 'in-development';
  case 'shipped':
  case 'enabled by default':
  case 'done':
  case 'partial support':
  case 'prefixed':
    return 'shipped';
  default:
    validateWarning('Unmapped status: "' + status + '" for "' + browser + '"');
    return 'invalid';
  }
}

class BrowserFeature {
  constructor(data) {
    this.data = data;
  }

  get status() {
    return normalizeStatus(this._rawStatus, this.name);
  }
}

class ChromeBrowserFeature extends BrowserFeature {
  constructor(data) {
    super(data);
    this.name = 'chrome';
  }

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

ChromeBrowserFeature.defaultUrl = 'https://www.chromestatus.com/features';

class WebKitBrowserFeature extends BrowserFeature {
  constructor(data) {
    super(data);
    this.name = 'webkit';
  }
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

WebKitBrowserFeature.defaultUrl = 'https://www.webkit.org/status.html';

class IEBrowserFeature extends BrowserFeature {
  constructor(data) {
    super(data);
    this.name = 'ie';
  }
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

IEBrowserFeature.defaultUrl = 'https://dev.modern.ie/platform/status/';

const allBrowserFeatures = [
  ['chrome', ChromeBrowserFeature],
  ['webkit', WebKitBrowserFeature],
  ['ie', IEBrowserFeature],
];

function populateBrowserFeatureData(browserData, features) {
  features.forEach((feature) => {
    allBrowserFeatures.map(([key, BrowserFeatureConstructor]) => {
      const browserFeatureData = browserData[key].get(feature[key + '_ref']);
      feature[key + '_status'] = 'unknown';
      feature[key + '_url'] = BrowserFeatureConstructor.defaultUrl;
      if (browserFeatureData) {
        const browserFeature = new BrowserFeatureConstructor(browserFeatureData);
        feature[key + '_status'] = browserFeature.status;
        feature[key + '_url'] = browserFeature.url;
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
      validateWarning('Unmapped standardization status: ' + status);
      normalized = 'invalid';
      break;
    }
    feature.spec_status = normalized;
  });
}

// Bugzilla has a limit on concurrent connections. I haven't found what the
// limit is, but 20 seems to work.
const bugzillaBottleneck = new Bottleneck(20);

function bugzillaFetch(bugzillaUrl) {
  return bugzillaBottleneck.schedule(fetch, bugzillaUrl);
}

function getBugzillaBugData(bugId) {
  return bugzillaFetch('https://bugzilla.mozilla.org/rest/bug?id=' + bugId)
  .then((response) => {
    return response.json();
  })
  .then((json) => {
    if (!json.bugs.length) {
      throw new Error('Bug not found(secure bug?)');
    }
    return json.bugs[0];
  })
  .catch((reason) => {
    validateWarning('Failed to get bug data for: ' + bugId + ': ' + reason);
    return null;
  });
}

function populateBugzillaData(features) {
  return Promise.all(features.map((feature) => {
    if (!feature.bugzilla) {
      return null;
    }
    return getBugzillaBugData(feature.bugzilla)
    .then((bugData) => {
      if (!bugData) {
        feature.bugzilla_status = null;
        return null;
      }
      feature.bugzilla_status = bugData.status;
      feature.bugzilla_resolved_count = 0;
      if (bugData.status === 'RESOLVED') {
        feature.bugzilla_resolved_count++;
      }
      // Check all the dependent bugs to count how many are resolved.
      return Promise.all(bugData.depends_on.map(getBugzillaBugData))
      .then((dependantBugs) => {
        // Add one to show status of the tracking bug itself.
        feature.bugzilla_dependant_count = dependantBugs.length + 1;
        for (const dependantBug of dependantBugs) {
          if (!dependantBug) {
            // Probably was secure bug.
            continue;
          }
          if (dependantBug.status === 'RESOLVED') {
            feature.bugzilla_resolved_count++;
          }
        }
      });
    });
  }));
}

function populateFirefoxStatus(versions, features) {
  features.forEach((feature) => {
    if (!isNaN(feature.firefox_status)) {
      const version = parseInt(feature.firefox_status, 10);
      feature.firefox_version = version;
      if (version <= versions.stable) {
        feature.firefox_status = 'shipped';
      } else {
        feature.firefox_status = 'in-development';
      }
    }
  });
}

function validate(data) {
  // We could potentially use a real JSON schema, but we'd still have to do
  // uniqueness checks ourselves.
  const schema = {
    'title': {
      required: true,
      unique: true,
    },
    'summary': {
      required: true,
      unique: true,
    },
    'bugzilla': {
      required: true,
      unique: true,
    },
    'firefox_status': {
      required: true,
    },
    'mdn_url': {
      required: true,
      unique: true,
    },
    'spec_url': {
      required: true,
      unique: true,
    },
    'chrome_ref': {
      required: true,
      unique: true,
    },
    'webkit_ref': {
      required: true,
      unique: true,
    },
    'ie_ref': {
      required: true,
      unique: true,
    },
    'standardization': {
      required: true,
    },
  };
  const uniques = {};
  data.features.forEach((feature) => {
    for (const key of Object.keys(schema)) {
      const value = feature[key];

      if (schema[key].required && !value) {
        validateWarning(feature.file + ': missing ' + key);
      }

      if (schema[key].unique && typeof value !== 'undefined') {
        if (!(key in uniques)) {
          uniques[key] = {};
        }
        const duplicate = uniques[key][value];
        if (duplicate) {
          validateWarning(feature.file + ': duplicate value "' + value + '" for key "' + key + '", previously defined in ' + duplicate);
        } else {
          uniques[key][value] = feature.file;
        }
      }
    }
  });
}

let alt = null;
handlebars.registerHelper('alt', (state, field, variance) => {
  if (!alt) {
    alt = JSON.parse(fs.readFileSync('./src/tpl/alt.json'));
  }
  const value = alt[field][state] || null;
  if (!value || typeof variance !== 'string') {
    return value;
  }
  return value[variance];
});

handlebars.registerHelper('if_eq', function comparison(left, right, opts) { // No fat-arrow since we want don't want lexical 'this'
  if (left === right) {
    return opts.fn(this);
  }
  return opts.inverse(this);
});

function buildIndex(status) {
  const templateContents = fs.readFileSync('src/tpl/index.html', {
    encoding: 'utf-8',
  });
  return Promise.resolve(handlebars.compile(templateContents)(status));
}

function buildStatus(options) {
  validationWarnings = [];
  return Promise.all([
    fixtureParser.read(),
    browserParser.read(options),
    firefoxVersionParser.read(options),
  ]).then(() => {
    return populateBugzillaData(fixtureParser.results);
  }).then(() => {
    populateFirefoxStatus(firefoxVersionParser.results, fixtureParser.results);
    populateBrowserFeatureData(browserParser.results, fixtureParser.results);
    populateSpecStatus(browserParser.results, fixtureParser.results);
    const data = {
      created: (new Date()).toISOString(),
      features: fixtureParser.results,
      firefoxVersions: firefoxVersionParser.results,
    };
    validate(data);
    if (validationWarnings.length) {
      console.warn('Validation warnings: ');
      validationWarnings.forEach((warning) => {
        console.warn('\t' + warning);
      });
    }
    return data;
  }).catch((err) => {
    console.error(err);
  });
}

export default {
  buildStatus: buildStatus,
  buildIndex: buildIndex,
};
