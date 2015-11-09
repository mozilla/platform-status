/* vim: set filetype=javascript sw=2 tw=80 : */

define(function(require) {
  const bdd = require('intern!bdd');
  const assert = require('intern/chai!assert');

  // This `Page` object gives us access to things on index.html
  const IndexPage = require('tests/support/pages/main');

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
  // `this.remote` is how we control the test browser for functional
  // tests. Instead of using it directly, we pass it to the constructors
  // for "page objects". We use those page objects to control the page
  // and query information about its status. If you need to test a new
  // page, write a new page object. If you need to extend the functionality
  // of a page object, feel free to do so!

  bdd.describe('Browser functional tests', function() {
    bdd.describe('main page', function() {
      bdd.it('should have correct title', function() {
        const page = new IndexPage(this.remote);

        page.title.then(function(title) {
          assert(title, 'title exists');
          assert.equals(title, 'Firefox Platform Status');
        });
      });
    });
  });
});
