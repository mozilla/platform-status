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
          // …then compile it into JavaScript code…
          var code = babel.transform(sourceCode).code;

          // …then execute the compiled function. In this case,
          // the compiled code returns its value. An AMD module would
          // call a `define` function, and a CJS module would set its
          // values on `exports` or `module.exports`.
          load(new Function(code)());
        });
      },
    };
  }
);
