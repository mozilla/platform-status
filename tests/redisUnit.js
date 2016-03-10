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


function quitDB(client) {
  return new Promise((resolve) => client.flushdb(() => client.quit(() => resolve())));
}

define((require) => {
  const bdd = require('intern!bdd');
  const assert = require('intern/chai!assert');
  // This modifies the node module loader to work with es2015 modules.
  // All subsequent `require` calls that use the node module loader
  // will use this modified version and will be able to load es2015
  // modules.
  require('intern/dojo/node!babel-core/register');

  const engine = require('intern/dojo/node!../../../../engine/index').test;
  const redis = require('intern/dojo/node!../../../../engine/redis-helper').default;

  bdd.describe('Saves status in redis', () => {
    // clean and quit database after each test
    bdd.afterEach(() => redis.getClient(5)
      .then((client) => quitDB(client))
    );

    bdd.describe('`status` key', () => {
      bdd.it('should hold all info provided to saveData', () => {
        // data after checkForNewData
        const testData = [{
          slug: 'feature',
          a: 'value A',
          b: 'value B',
          updated: {} }];
        return engine.saveData(testData, 5)
        .then(() => redis.getClient(5))
        .then((client) => new Promise((resolve) => {
          client.get('status', (err, statusData) => {
            assert.notOk(err, `ERROR: ${err}`);
            assert.ok(statusData);
            statusData = JSON.parse(statusData);
            assert.deepEqual(testData[0], statusData.feature);
            resolve(client);
          });
        }))
        .then(quitDB);
      });
    });

    bdd.describe('checkForNewData', () => {
      bdd.it('should mark as just started', () => {
        const testData = [{
          slug: 'feature',
          firefox_status: 'value A',
          b: 'value B' }];
        return engine.checkForNewData(testData, 5)
        .then((features) => {
          assert.deepEqual(features[0].updated, {});
          assert.isTrue(features[0].just_started);
        });
      });

      bdd.it('should add changed status to features', () => {
        const testData = [{
          slug: 'feature',
          firefox_status: 'first',
          b: 'value B',
        }];
        return engine.checkForNewData(testData, 5)
        .then((features) => engine.saveData(features, 5))
        .then((features) => {
          features[0].firefox_status = 'last';
          return features;
        })
        .then((features) => engine.checkForNewData(features, 5))
        .then((features) => {
          assert.notOk(features[0].just_started);
          assert.equal(features[0].updated.firefox_status.from, 'first');
          assert.equal(features[0].updated.firefox_status.to, 'last');
        });
      });
    });

    bdd.describe('`changelog` hash', () => {
      bdd.it('logs just_started in database', () => {
        const now = new Date();
        const testData = [{
          slug: 'feature',
          firefox_status: 'first',
          b: 'value B',
        }];
        return engine.checkForNewData(testData, 5)
        .then((features) => engine.saveData(features, 5))
        .then(() => redis.getClient(5))
        .then((client) => new Promise((resolve) => {
          client.hgetall('changelog', (err, logs) => {
            assert.notOk(err);
            assert.isObject(logs);
            var logTime = Object.keys(logs)[0];
            const log = JSON.parse(logs[logTime]);
            assert.lengthOf(log.started, 1);
            assert.isTrue(log.started[0].just_started);
            assert.equal(log.started[0].firefox_status, 'first');
            // did it happen in the right period of time?
            logTime = new Date(logTime);
            const after = new Date();
            assert.isTrue((now <= logTime), 'too early');
            assert.isTrue((after >= logTime), 'too late');
            resolve(client);
          });
        }))
        .then(quitDB);
      });

      bdd.it('should contain latest changes', () => {
        const now = new Date();
        const testData = [{
          slug: 'feature',
          firefox_status: 'first',
          b: 'value B',
          updated: {},
        }];
        var firstLogKey;
        return engine.checkForNewData(testData, 5)
        .then(features => engine.saveData(features, 5))
        .then(features => {
          features[0].firefox_status = 'last';
          return redis.getClient(5)
          .then(client => {
            redis.hgetall(client, 'changelog')
            .then(logs => {
              firstLogKey = Object.keys(logs)[0];
              return redis.quit(client);
            });
          })
          .then(() => engine.checkForNewData(features, 5));
        })
        .then(features => engine.saveData(features, 5))
        .then(() => redis.getClient(5))
        .then(client =>
          redis.hgetall(client, 'changelog')
          .then(logs => {
            assert.ok(logs);
            // there shoulf be only one change logged
            assert.equal(Object.keys(logs).length, 2);
            // find older entry
            const logTimes = Object.keys(logs);
            var logTime = logTimes[0];
            if (logTime === firstLogKey) {
              logTime = logTimes[1];
            }
            const log = JSON.parse(logs[logTime]);
            assert.equal(log.updated.feature.firefox_status.from, 'first');
            assert.equal(log.updated.feature.firefox_status.to, 'last');
            // did it happen in the right period of time?
            logTime = new Date(logTime);
            const after = new Date();
            assert((now <= logTime), 'too early');
            assert((after >= logTime), 'too late');
          })
          .then(() => quitDB(client))
        );
      });
    });
  });
});
