define({
  loaderOptions: {
    paths: {
    },
  },

  suites: [
    'tests/nodeUnit',
    'tests/redisUnit',
    'tests/notificationsUnit',
    'tests/apiUnit',
    'tests/cacheUnit'],

  // A regexp to exclude from code coverage calculations
  excludeInstrumentation: /^(?:tests|node_modules)\//,
});
