/* vim: set filetype=javascript sw=2 tw=80 : */

define({
  loaderOptions: {
    paths: {
      nodeTests: 'tests/node',
    },
  },

  suites: [ 'nodeTests/buildOutput' ],

  // A regexp to exclude from code coverage calculations
  excludeInstrumentation: /^(?:tests|node_modules)\//,
});
