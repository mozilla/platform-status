import redis from './redis-helper.js';

// return status as an object
function getStatus(dbNumber) {
  return redis.getClient(dbNumber)
  .then((client) => redis.get(client, 'status'))
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
  getStatus,
  getFeatureStatus,
};
