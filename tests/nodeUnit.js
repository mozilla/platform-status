// This file is written as an AMD module that will be loaded by the Intern
// test client. The test client can load node modules directly to test
// that individual pieces are working as expected.
//
// The flow for each test is generally:
//   1. Load the module you wish to perform unit tests on
//   2. Call the functions of that module directly and use the assert
//      library to verify expected results
//
// More info on writing Unit tests with Intern:
//    https://theintern.github.io/intern/#writing-unit-test
//
// We have chosen to use Intern's "BDD" interface (as opposed to the other
// options that Intern provides - "Object," "TDD," and "QUnit"):
//    https://theintern.github.io/intern/#interface-tdd/
//
// We have chosen to use Chai's "assert" library (as opposed to the other
// options that Chai provides - "expect" and "should"):
//    http://chaijs.com/api/assert/

define(require => {
  const bdd = require('intern!bdd');
  const assert = require('intern/chai!assert');
  const fs = require('intern/dojo/node!fs');
  const path = require('intern/dojo/node!path');
  const del = require('intern/dojo/node!del');

  bdd.describe('Node unit', () => {
    bdd.before(() => {
      // This modifies the node module loader to work with es2015 modules.
      // All subsequent `require` calls that use the node module loader
      // will use this modified version and will be able to load es2015
      // modules.
      require('intern/dojo/node!babel-core/register');
    });

    bdd.describe('Build process', () => {
      // No current tests
    });

    bdd.describe('Engine', () => {
      bdd.describe('fixtureParser', () => {
        bdd.it('should something', () => {
          var FixtureParser = require('intern/dojo/node!../../../../engine/fixtureParser').default;
          var fp = new FixtureParser('asdf');
          assert(fp);
        });
      });

      bdd.describe('normalizeStatus', () => {
        bdd.it('should convert empty strings', () => {
          var indexJS = require('intern/dojo/node!../../../../engine/index').test;
          assert.equal(indexJS.normalizeStatus(''), 'unknown');
        });

        bdd.it('should leave known strings untouched', () => {
          var indexJS = require('intern/dojo/node!../../../../engine/index').test;

          var strings = [
            'unknown',
            'not-planned',
            'deprecated',
            'under-consideration',
            'in-development',
            'shipped',
          ];

          strings.forEach(val => {
            assert.equal(indexJS.normalizeStatus(val), val);
          });
        });

        bdd.it('should throw Error objects for invalid strings', () => {
          var indexJS = require('intern/dojo/node!../../../../engine/index').test;
          assert.throws(indexJS.normalizeStatus.bind(null, 'asdf'));
          assert.throws(indexJS.normalizeStatus.bind(null, 'a string'));

          assert.throws(indexJS.normalizeStatus.bind(null, '-8023'));
          assert.throws(indexJS.normalizeStatus.bind(null, '91257'));

          assert.throws(indexJS.normalizeStatus.bind(null, 1234));
          assert.throws(indexJS.normalizeStatus.bind(null, -1234));

          assert.throws(indexJS.normalizeStatus.bind(null, null));
          assert.throws(indexJS.normalizeStatus.bind(null));
        });
      });
    });

    bdd.describe('Cache', () => {
      const nock = require('intern/dojo/node!nock');
      const cache = require('intern/dojo/node!../../../../engine/cache').default;
      const cacheDir = 'tests/support/var/engineCache';
      const redis = require('intern/dojo/node!../../../../engine/redis-helper').default;
      bdd.before(() => {
        // Create the tests var dir if it doesn't already exist
        const dir = path.dirname(cacheDir);

        var stats;
        try {
          stats = fs.statSync(dir);
          if (!stats.isDirectory()) {
            throw new Error('tests var dir exists but is not a directory');
          }
        } catch (statErr) {
          if (statErr.code !== 'ENOENT') {
            throw statErr;
          }

          fs.mkdirSync(dir);
        }

        // The test cache dir shouldn't exist, but delete it if it does
        return del([cacheDir]);
      });

      bdd.after(() =>
        cache.quitRedis()
        .then(() => redis.quitClient()));

      // Remove the test cache dir
      bdd.afterEach(() =>
        del([cacheDir])
        .then(() => redis.flushdb())
        // Don't let tests interfere with each other's calls to `fetch`
        .then(() => nock.cleanAll())
      );

      bdd.beforeEach(() => {
        // Make dir to cache files to during tests
        fs.mkdirSync(cacheDir);
      });

      bdd.it('should cache files', () => {
        const testURL = 'http://somejsonurl.com';
        const testObject = { some: 'value' };

        nock(testURL)
        .get('/')
        .reply(200, testObject, {
          'cache-control': 'max-age=100',
        })
        .get('/')
        .reply(304);

        // Cache our package.json file
        return cache.readJson(testURL)
        // Get our package.json (should succeed from cache)
        .then(originalText => cache.readJson(testURL)
          .then(cachedText => {
            // Compare the original text with the cached text
            assert.deepEqual(cachedText, originalText);
            assert.deepEqual(cachedText, testObject);
          })
        );
      });

      bdd.it('should reject on 404s', () => {
        const testURL = 'https://somejsonurl.com';

        nock(testURL)
        .get('/')
        .reply(404);

        return cache.readJson(testURL).then(() => {
          assert.fail('`cache.readJson` should have rejected on a 404');
        }).catch(err => {
          assert(err instanceof Error);
          return true;
        });
      });
    });
  });
});
