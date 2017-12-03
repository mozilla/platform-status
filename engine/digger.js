import redis from './redis-helper';

// return status as an object
function getStatus() {
  return redis.get('status')
  .then(status => JSON.parse(status));
}

// return status of a feature as an object
function getFeatureStatus(slug) {
  return getStatus()
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
