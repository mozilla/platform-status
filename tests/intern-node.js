define({
  loaderOptions: {
    paths: {
    },
  },

  suites: [ 'tests/nodeUnit' ],

  // A regexp to exclude from code coverage calculations
  excludeInstrumentation: /^(?:tests|node_modules)\//,
});
