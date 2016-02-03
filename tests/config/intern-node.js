define({
  loaderOptions: {
    paths: {
    },
  },

  suites: ['tests/nodeUnit', 'tests/redisUnit'],

  // A regexp to exclude from code coverage calculations
  excludeInstrumentation: /^(?:tests|node_modules)\//,
});
