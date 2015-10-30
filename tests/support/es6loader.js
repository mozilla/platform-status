/* vim: set filetype=javascript sw=2 tw=80 : */

define([
  'intern/dojo/node!babel-core',
  'intern/dojo/node!fs',
  ],
  function (babel, fs) {
    return {
      load: function (resourceId, require, load) {
        // Get the raw source code…
        fs.readFile(require.toUrl(resourceId), function (err, sourceCode) {
          if (err) {
            throw err;
          }

          // …then compile it into JavaScript code…
          var code = babel.transform(sourceCode).code;

          var path = './tests/support/var/' + resourceId.replace(/\//g, '-').replace(/\./g, '') + '.js';

          // write the ES5 into a temporary js file
          fs.writeFile(path, code, function (err) {
            if (err) {
              throw err;
            }

            // load the temporary ES5 js file as a node module
            require(['intern/dojo/node!.' + path], function (value) {
              // return the result
              load(value);
            });
          });
        });
      },
    };
  }
);
