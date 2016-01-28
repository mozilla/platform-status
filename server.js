const express = require('express');
const fs = require('fs');
const compression = require('compression');
const app = express();

const distPublicDir = './dist/public';

app.use(function forceHost(req, res, next) {
  const host = req.get('Host');
  if (!host.startsWith('localhost') && host !== 'platform-status.mozilla.org') {
    res.redirect(301, 'https://platform-status.mozilla.org' + req.url);
  }
  return next();
});

app.use(function forceSSL(req, res, next) {
  const host = req.get('Host');
  if (!host.startsWith('localhost')) {
    // https://developer.mozilla.org/en-US/docs/Web/Security/HTTP_strict_transport_security
    res.header('Strict-Transport-Security', 'max-age=15768000');
    // https://github.com/rangle/force-ssl-heroku/blob/master/force-ssl-heroku.js
    if (req.headers['x-forwarded-proto'] !== 'https') {
      return res.redirect(301, 'https://' + host + req.url);
    }
  }
  return next();
});

app.use(function corsify(req, res, next) {
  // http://enable-cors.org/server_expressjs.html
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, Content-Type, Accept');
  next();
});

app.use(compression());

if (!fs.existsSync(distPublicDir)) {
  throw new Error('Missing `dist` folder, execute `npm run build` first.');
}
app.use(express.static(distPublicDir));

const port = process.env.PORT || 3003;
app.listen(port, function didListen(err) {
  if (err) {
    return;
  }
  console.log('app.listen on http://localhost:%d', port);
});
