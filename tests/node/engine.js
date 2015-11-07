/* vim: set filetype=javascript sw=2 tw=80 : */

define(function(require) {
  // This file uses BDD style. Other styles are available
  var bdd = require('intern!bdd');
  // This file uses the chai assert library. Other libraries available.
  var assert = require('intern/chai!assert');

  bdd.describe('Engine', function() {
    bdd.before(function() {
      // executes before test suite starts
      //
      // This modifies the node module loader to work with es2015 modules.
      // All subsequent `require` calls that use the node module loader
      // will use this modified version and will be able to load es2015
      // modules.
      require('intern/dojo/node!babel-core/register');
    });

    bdd.after(function() {
      // executes after test suite ends
    });

    bdd.beforeEach(function() {
      // executes before each sub-suite or test
    });

    bdd.afterEach(function() {
      // executes after each sub-suite or test
    });

    // This is a sub-suite
    bdd.describe('fixtureParser', function() {
      // This is a test
      bdd.it('should something', function() {
        // Don't throw an error and the test will pass
        // throw new Error('This will cause the test to fail');
        //
        // Return a Promise for async tests. If the promise eventually
        // resolves, the test passes. If the promise eventually
        // rejects, the test fails.
        //
        // `this` refers to a test suite object. You can use it to
        // skip the test or do other test-specific things.
        //
        // `this.remote` is how we control the test browser for functional
        // tests. It will be null for unit tests.

        // Actual test starts here

        // The node module loader for some reason has wacky path resolution.
        // I wish we didn't have to have all these '..' but, alas.
        var FixtureParser = require('intern/dojo/node!../../../../engine/fixtureParser');
        var fp = new FixtureParser('asdf');
        assert(fp);
      });
    });
  });
});
