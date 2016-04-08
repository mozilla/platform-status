import Eu from 'eu';
import redis from 'redis';

let eu = null;
let client = null;

function getRequest(dbNumber) {
  if (eu) {
    return Promise.resolve(eu);
  }
  return new Promise((resolve, reject) => {
    console.log('XXX: opening new redis connection');
    client = redis.createClient({
      url: process.env.REDIS_URL,
    });
    if (!dbNumber) {
      return resolve(client);
    }
    client.select(dbNumber, err => {
      if (err) {
        client.quit();
        reject(err);
        return;
      }
      resolve(client);
    });
  })
  .then(() => {
    const store = new Eu.RedisStore(client);
    const cache = new Eu.Cache(store);
    eu = new Eu(cache);
    return eu;
  });
}

function readJson(url, dbNumber) {
  return getRequest(dbNumber)
  .then(request => new Promise((resolve, reject) => {
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

function quitRedis() {
  if (client) {
    const response = new Promise(resolve => client.quit(resolve));
    client = null;
    eu = null;
    return response;
  }
  return Promise.reject(new Error('No client open'));
}

export default {
  getRequest,
  readJson,
  quitRedis,
};
