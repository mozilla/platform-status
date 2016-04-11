import Eu from 'eu';
import redis from 'redis';

let eu = null;
let client = null;
let redisIndex = null;

function selectIndex() {
  if (!client) {
    return Promise.reject(new Error('No client'));
  }
  return new Promise((resolve, reject) => {
    if (process.env.REDIS_INDEX === undefined || redisIndex === process.env.REDIS_INDEX) {
      return resolve();
    }
    redisIndex = process.env.REDIS_INDEX;
    client.select(redisIndex, err => {
      if (err) {
        client.quit();
        reject(err);
        return;
      }
      resolve();
    });
  });
}

function getRequest() {
  if (eu) {
    return selectIndex()
    .then(() => eu);
  }
  client = redis.createClient({
    url: process.env.REDIS_URL,
  });
  return selectIndex()
  .then(() => {
    const store = new Eu.RedisStore(client);
    const cache = new Eu.Cache(store);
    eu = new Eu(cache);
    return eu;
  });
}

function readJson(url) {
  return getRequest()
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
