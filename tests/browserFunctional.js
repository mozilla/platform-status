// This file is written as an AMD module that will be loaded by the Intern
// test-runner. The test runner is communicating with a Selenium server
// that is controlling a browser. These tests can remote-control the browser
// and probe the displayed pages to verify that pages are functioning and
// displaying as expected.
//
// The flow for each test is generally:
//   1. Create a page object, passing `this.remote` as an argument
//   2. Use the page object to interact with the page and use the assert
//      library to verify expected results
//
// More info on writing functional tests with Intern:
//   https://theintern.github.io/intern/#writing-functional-test
//
// For each page that we want to test, we have written or should write an
// "Intern Page Object." Adding/extending tests will frequently mean
// adding/extending page objects as well:
//   https://theintern.github.io/intern/#page-objects
//
// `this.remote` is a `Command` object. It is very useful when writing
// page objects to understand the `Command` object interface. Sometimes
// it is necessary to interact with a raw `Command` object in a test, so
// the documentation is linked here:
//    https://theintern.github.io/leadfoot/Command.html
//
// We have chosen to use Intern's "BDD" interface (as opposed to the other
// options that Intern provides - "Object," "TDD," and "QUnit"):
//    https://theintern.github.io/intern/#interface-tdd/
//
// We have chosen to use Chai's "assert" library (as opposed to the other
// options that Chai provides - "expect" and "should"):
//    http://chaijs.com/api/assert/

define(function(require) {
  const bdd = require('intern!bdd');
  const assert = require('intern/chai!assert');

  const IndexPage = require('tests/support/pages/main');

  bdd.describe('Browser functional tests', function() {
    bdd.describe('main page', function() {
      bdd.it('should have correct title', function() {
        const page = new IndexPage(this.remote);

        return page.title.then(function(title) {
          assert(title, 'title exists');
          assert.equal(title, 'Firefox Platform Status');
        });
      });

      bdd.it('should have link to GitHub repo', function() {
        const page = new IndexPage(this.remote);

        return page.followRepoLink().getPageTitle().then(function(title) {
          assert.equal(title, 'mozilla/platatus · GitHub');
        });
      });

      bdd.it('should have link to file issues', function() {
        const page = new IndexPage(this.remote);

        return page.followFileIssueLink().getPageTitle().then(function(title) {
          // TODO: We probably want to sign in and verify that we're actually
          // on the right page
          assert.equal(title, 'Sign in to GitHub · GitHub');
        });
      });
    });
  });
});
