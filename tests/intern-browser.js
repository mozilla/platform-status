/* vim: set filetype=javascript sw=2 tw=80 : */

define({
  capabilities: {
  },

  environments: [
    { browserName: 'firefox' },
  ],

  maxConcurrency: 2,

  // https://theintern.github.io/digdug/NullTunnel.html
  tunnel: 'NullTunnel',
  tunnelOptions: {
    hostname: 'localhost',
    port: 4444,
    pathname: '/wd/hub/',
  },

  loaderOptions: {
    packages: [ { name: 'browserTests', location: './tests/browser' } ]
  },

  // Unit tests that you want to run in browsers go here. These tests
  // cannot load particular web pages. Only JS can be tested in this
  // type of test.
  suites: [ ],

  // End-to-end tests (ones that load specific pages)
  // go here. Pages can be loaded and interacted with.
  functionalSuites: [ 'browserTests/main' ],

  excludeInstrumentation: /^(?:tests|node_modules)\//
});
