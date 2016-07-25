require('newrelic');
const app = require('./dist/app');

const port = process.env.PORT || 3003;
app.listen(port, err => {
  if (err) {
    return;
  }
  console.log('app.listen on http://localhost:%d', port);
});
