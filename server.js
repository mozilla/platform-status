const app = require('./app');

const port = process.env.PORT || 3003;
app.listen(port, function didListen(err) {
  if (err) {
    return;
  }
  console.log('app.listen on http://localhost:%d', port);
});
