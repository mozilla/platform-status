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
  const chaiHttp = require('intern/dojo/node!chai-http');
  chai.use(chaiHttp);
  const assert = chai.assert;

  // This modifies the node module loader to work with es2015 modules.
  // All subsequent `require` calls that use the node module loader
  // will use this modified version and will be able to load es2015
  // modules.
  require('intern/dojo/node!babel-core/register');
  const digger = require('intern/dojo/node!../../../../engine/digger').default;
  const engine = require('intern/dojo/node!../../../../engine/index').test;
  const redis = require('intern/dojo/node!../../../../engine/redis-helper').default;

  function flushDB(client) {
    return redis.flushdb(client);
  }
  function flushQuitDB(client) {
    return flushDB(client).then(() => digger.quitClient(5));
  }


  bdd.describe('digger module', () => {
    // clean and quit database after each test
    bdd.beforeEach(() => digger.setClient(5));

    bdd.afterEach(() =>
      digger.setClient(5)
      .then((client) => flushQuitDB(client)));

    bdd.describe('getStatus', () => {
      bdd.it('should return null if no status in db', () =>
        digger.getStatus(5)
        .then(status => {
          assert.notOk(status);
          assert.isNull(status);
        })
      );

      bdd.it('should return an object saved as JSON in status key', () =>
        digger.setClient(5)
        .then(client => redis.set(client, 'status', '{ "test": "data" }'))
        .then(() => digger.getStatus())
        .then(status => {
          assert.ok(status);
          assert.deepEqual({ test: 'data' }, status);
        })
      );
    });

    bdd.describe('getFeatureStatus', () => {
      bdd.it('should throw if no status in db', () =>
        digger.getFeatureStatus('not-existing', 5)
        .catch(err => {
          assert.equal(err.message, 'Not Found');
        })
      );

      bdd.it('should throw if no feature in status', () =>
        digger.setClient(5)
        .then(client => redis.set(client, 'status', '{ "test": "data" }'))
        .then(() => digger.getFeatureStatus('not-existing', 5))
        .catch(err => {
          assert.equal(err.message, 'Not Found');
        })
      );

      bdd.it('should return the value stored under key defined by slug', () => {
        const testData = {
          slug: 'feature',
          a: 'value A',
          b: 'value B',
          updated: {} };

        return digger.setClient(5)
        .then(() => engine.saveData([testData], 5))
        .then(() => digger.getFeatureStatus('feature', 5))
        .then(featureStatus => {
          assert.ok(featureStatus);
          assert.deepEqual(featureStatus, testData);
        });
      });
    });
  });

  bdd.describe('api route', () => {
    const portfinder = require('intern/dojo/node!portfinder');
    const platatus = require('intern/dojo/node!../app');

    var port;
    var server;
    function api() {
      return chai.request(`http://localhost:${port}`);
    }

    // set database channel
    bdd.beforeEach(() => digger.setClient(5));

    // find port and spin the server
    bdd.before(() => new Promise((resolve) => {
      portfinder.getPort((err, receivedPort) => {
        port = receivedPort;
        server = platatus.listen(port, () => {
          console.log('server is running on port %j', port);
          resolve();
        });
      });
    }));

    bdd.after(() => server.close());

    // clean and quit database after each test
    bdd.afterEach(() =>
      digger.setClient(5)
      .then((client) => flushQuitDB(client)));

    bdd.describe('/api/status', () => {
      bdd.it('returns null if no status', () =>
        api()
        .get('/api/status')
        .send()
        .then(response => {
          assert.strictEqual(response.body, null);
        })
      );

      bdd.it('should return the value stored under key defined by slug', () => {
        const testData = {
          slug: 'feature',
          a: 'value A',
          b: 'value B',
          updated: {} };

        return digger.setClient(5)
        .then(() => engine.saveData([testData], 5))
        .then(() => api()
          .get('/api/status')
          .send()
        )
        .then(response => {
          assert.property(response.body, 'feature');
          assert.deepEqual(response.body.feature, testData);
        });
      });
    });

    bdd.describe('/api/feature/{slug}', () => {
      bdd.it('returns 404 if getFeatureStatus throws', () =>
        api()
        .get('/api/feature/some-status')
        .send()
        .catch(err => {
          assert.equal(err.response.status, 404);
        })
      );

      bdd.it('returns savedData', () => {
        const testData1 = {
          slug: 'feature',
          a: 'value A',
          b: 'value B',
          updated: {} };
        const testData2 = {
          slug: 'another-feature',
          a: 'another A',
          b: 'another B',
          updated: {} };

        return digger.setClient(5)
        .then(() => engine.saveData([testData1, testData2], 5))
        .then(() => api()
          .get('/api/feature/feature')
          .send()
        )
        .then(response => {
          assert.deepEqual(response.body, testData1);
        })
        .then(() => api()
          .get('/api/feature/another-feature')
          .send()
        )
        .then(response => {
          assert.deepEqual(response.body, testData2);
        });
      });
    });
  });
});
