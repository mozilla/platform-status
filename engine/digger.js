import redis from './redis-helper.js';

let client;

// let's make client a singleton
function setClient(dbNumber) {
  if (client) {
    return Promise.resolve(client);
  }
  return redis.getClient(dbNumber)
  .then(redisClient => {
    client = redisClient;
    return client;
  });
}

function quitClient(dbNumber) {
  return setClient(dbNumber)
  .then(() => {
    const ret = redis.quit(client);
    client = null;
    return ret;
  });
}

// return status as an object
function getStatus(dbNumber) {
  return setClient(dbNumber)
  .then(() => redis.get(client, 'status'))
  .then(status => JSON.parse(status));
}

// return status of a feature as an object
function getFeatureStatus(slug, dbNumber) {
  return getStatus(dbNumber)
  .then(status => {
    if (!status || !status[slug]) {
      throw new Error('Not Found');
    }
    return status[slug];
  });
}

export default {
  setClient,
  quitClient,
  getStatus,
  getFeatureStatus,
};
