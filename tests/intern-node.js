/* vim: set filetype=javascript sw=2 tw=80 : */

define({
  loaderOptions: {
    packages: [ { name: 'nodeTests', location: './tests/node' } ]
  },

  suites: [ 'nodeTests/buildOutput' ],

  excludeInstrumentation: /^(?:tests|node_modules)\//
});
