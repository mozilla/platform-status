function quitDB(client) {
  return new Promise((resolve) => {
    client.flushdb(() => {
      // never fails
      resolve();
    });
  })
  .then(() => new Promise((resolve) => {
    client.quit(() => {
      // do not check for errors, just resolve
      resolve();
    });
  }));
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

  // Create a sub-suite with `bdd.describe`. Sub-suites can
  // have their own sub-suites; just use `bdd.describe`
  // within a suite.
  //
  // Use `bdd.before` to define a function that will
  // run before the suite starts, `bdd.after` to define a
  // function that will run after the suite ends, `bdd.beforeEach`
  // to define a function that will run before each test or sub-suite,
  // and `bdd.afterEach` to define a function that will run after each
  // test or sub-suite.
  //
  // Use `bdd.it` to define actual test cases.
  //
  // Within a test, throwing an `Error` object will cause the test to fail.
  // Returning a promise will make the test async; if the promise
  // eventually resolves then the test will pass. If the promise
  // eventually rejects then the test will fail. Reject with a descriptive
  // `Error` object please.
  //
  // Within a test, `this` refers to a test suite object. You can use it
  // to skip the test or do other test-specific things.
  //
  // `this.remote` is null for unit tests.

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
            assert.notOk(err, 'ERROR: ' + err);
            assert(statusData, 'expected truthy, got ' + statusData);
            statusData = JSON.parse(statusData);
            assert.equal(testData[0].a, statusData.feature.a);
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
        .then((features) => engine.saveData(features, 5))
        .then((features) => new Promise((resolve) => {
          features[0].firefox_status = 'last';
          redis.getClient(5)
          .then((client) => {
            client.hgetall('changelog', (err, logs) => {
              assert.notOk(err);
              firstLogKey = Object.keys(logs)[0];
              client.quit(() => resolve(features));
            });
          });
        }))
        .then((features) => engine.checkForNewData(features, 5))
        .then((features) => engine.saveData(features, 5))
        .then(() => redis.getClient(5))
        .then((client) => new Promise((resolve) => {
          client.hgetall('changelog', (err, logs) => {
            assert.notOk(err, 'ERROR: ' + err);
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
            resolve(client);
            // TODO: find out while node hangs here usually waits for
            // the end of connection with redis
          });
        }))
        .then(quitDB);
      });
    });
  });
});
