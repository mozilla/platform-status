import Eu from 'eu';
import redis from 'redis';

let eu = null;

function getRequest(dbNumber) {
  if (eu) {
    return Promise.resolve(eu);
  }
  return new Promise((resolve, reject) => {
    const client = redis.createClient({
      url: process.env.REDIS_URL,
    });
    if (!dbNumber) {
      resolve(client);
      return;
    }
    client.select(dbNumber || 0, err => {
      if (err) {
        reject(err);
        return;
      }
      resolve(client);
    });
  })
  .then((client) => {
    const store = new Eu.RedisStore(client);
    const cache = new Eu.Cache(store);
    eu = new Eu(cache);
    return eu;
  });
}

function readJson(url, dbNumber) {
  return getRequest(dbNumber)
  .then((request) => new Promise((resolve, reject) => {
    // we're getting the JSON anyway (?)
    request.get(url, { json: true }, (err, res, body) => {
      if (err) {
        return reject(err);
      }
      if (res.statusCode === 404) {
        return reject(new Error('Not Found'));
      }
      resolve(body);
    });
  }));
}


export default {
  readJson,
};
