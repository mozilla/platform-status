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

define(function(require) {
  const bdd = require('intern!bdd');
  const assert = require('intern/chai!assert');

  const notifications = require('intern/dojo/node!../../../../engine/notifications');
  // const redis = require('intern/dojo/node!../../../../engine/redis-helper').default;

  bdd.describe('Notifications unit', function() {
    bdd.before(function() {
      // This modifies the node module loader to work with es2015 modules.
      // All subsequent `require` calls that use the node module loader
      // will use this modified version and will be able to load es2015
      // modules.
      require('intern/dojo/node!babel-core/register');
    });

    // clean and quit database after each test
    bdd.afterEach(() => notifications.test.setClient(5)
      .then((client) => quitDB(client))
    );

    bdd.describe('Backend', function() {
      bdd.describe('register', function() {
        bdd.it('should fail if no endpoint provided or stored', () => {
          notifications.default.register('someId', null, [])
          .catch(err => {
            assert.ok(err);
          });
        });
      });
    });
  });
});
