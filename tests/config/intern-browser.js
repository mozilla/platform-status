define({
  capabilities: {
  },

  environments: [
    { browserName: 'firefox' },
  ],

  maxConcurrency: 2,

  tunnel: 'tests/support/SeleniumTunnel.js',
  tunnelOptions: {
  },

  loaderOptions: {
  },

  // Unit tests that you want to run in browsers go here. These tests
  // cannot load particular web pages. Only JS can be tested in this
  // type of test.
  suites: [],

  // End-to-end tests (ones that load specific pages)
  // go here. Pages can be loaded and interacted with.
  functionalSuites: ['tests/browserFunctional'],

  excludeInstrumentation: /^(?:tests|node_modules)\//
});
