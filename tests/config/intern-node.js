define({
  loaderOptions: {
    paths: {
    },
  },

  suites: ['tests/nodeUnit', 'tests/redisUnit', 'tests/apiUnit'],

  // A regexp to exclude from code coverage calculations
  excludeInstrumentation: /^(?:tests|node_modules)\//,
});
