import Eu from 'eu';
import redis from 'redis';

function readJson(url, dbNumber) {
  return new Promise((resolve, reject) => {
    const client = redis.createClient(process.env.REDIS_URL, { no_ready_check: true });
    if (!dbNumber) {
      resolve(client);
      return;
    }
    client.select(dbNumber || 0, err => {
      if (err) {
        client.quit();
        reject(err);
        return;
      }
      resolve(client);
    });
  })
  .then(client => {
    const store = new Eu.RedisStore(client);
    const cache = new Eu.Cache(store);
    const eu = new Eu(cache);
    return new Promise((resolve, reject) => {
      // we're getting the JSON anyway (?)
      eu.get(url, { json: true }, (err, res, body) => {
        if (err) {
          reject(err);
          return;
        }
        if (res.statusCode === 404) {
          reject(new Error('Not Found'));
        }
        resolve(body);
      });
    })
    .catch(err => {
      client.quit();
      throw err;
    })
    .then(jsonResponse => {
      client.quit();
      return jsonResponse;
    });
  });
}


export default {
  readJson,
};
