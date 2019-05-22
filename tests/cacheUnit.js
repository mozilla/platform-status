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

define((require) => {
  const bdd = require('intern!bdd');
  const chai = require('intern/dojo/node!chai');
  const assert = chai.assert;

  // This modifies the node module loader to work with es2015 modules.
  // All subsequent `require` calls that use the node module loader
  // will use this modified version and will be able to load es2015
  // modules.
  require('intern/dojo/node!babel-core/register');
  const redis = require('intern/dojo/node!../../../../engine/redis-helper').default;
  const cache = require('intern/dojo/node!../../../../engine/cache').default;
  // const fetch = require('intern/dojo/node!node-fetch');
  const nock = require('intern/dojo/node!nock');

  bdd.describe('cache module', () => {
    bdd.describe('readJson', () => {
      bdd.after(() => cache.quitRedis()
        .then(() => redis.quitClient()));

      bdd.afterEach(() => redis.flushdb());

      bdd.it('should throw `Not Found` for 404', () => {
        nock('http://localhost:8001')
          .get('/')
          .reply(404);

        return cache.readJson('http://localhost:8001/')
          .catch((err) => {
            assert.ok(err);
            assert.equal(err.message, 'Not Found');
          });
      });

      bdd.it('should return JSON', () => {
        const testJSON = {
          value: 'testValue',
          array: [1, 2, 3],
          object: { a: 'a' },
        };
        nock('http://localhost:8001')
          .get('/')
          .reply(200, JSON.stringify(testJSON));

        return cache.readJson('http://localhost:8001/')
          .then((response) => {
            assert.isObject(response);
            assert.deepEqual(response, testJSON);
          });
      });
    });
  });
});
