/* vim: set filetype=javascript sw=2 tw=80 : */

define([
  // This example is a BDD style test, but other styles
  // are available including TDD and Object
  'intern!bdd',
  // This example shows off usage of the assert library.
  // Other libraries are available for checking that values
  // match expectations.
  'intern/chai!assert',
  // This `Page` object gives us access to things on index.html
  'tests/support/pages/main'
], function(bdd, assert, IndexPage) {
  bdd.describe('main page', function() {
    var page;

    bdd.before(function() {
      // executes before test suite starts
      page = new IndexPage(this.remote);
    });

    bdd.after(function() {
      // executes after test suite ends
    });

    bdd.beforeEach(function() {
      // executes before each test
    });

    bdd.afterEach(function() {
      // executes after each test
    });

    bdd.it('should have correct title', function() {
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
      // tests.
      page.title.then(function(title) {
        assert(title, 'title exists');
        assert.equals(title, 'Platatus!');
      });
    });
  });
});
