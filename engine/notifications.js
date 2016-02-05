import redis from '../engine/redis-helper.js';

let client;
function setClient(dbNumber) {
  return new Promise((resolve) => {
    if (client) {
      return resolve(client);
    }
    redis.getClient(dbNumber)
    .then((redisClient) => {
      client = redisClient;
      resolve(client);
    });
  });
}

// registers to receive notifications
// required info:
// * deviceId
// * list of feature slugs to register to
// optional:
// * endpoint
function register(deviceId, features, endpoint) {
  return setClient()
  .then(() => Promise.resolve(
        features.map((slug) => Promise.resolve([
          redis.sadd(client, slug + '-notifications', deviceId),
          redis.sadd(client, deviceId + '-notifications', slug)]))))
  .then(() => {
    if (endpoint) {
      return redis.set(client, deviceId + '-endpoint', endpoint);
    }
    return redis.get(client, deviceId + '-notifications');
  })
  .then(deviceEndpoint => {
    if (!deviceEndpoint) {
      throw new Error('No endpoint provided');
    }
  });
}

// get all registrations for a deviceId
function getRegisteredFeatures(deviceId) {
  return setClient()
  .then(() => redis.get(deviceId + '-endpoint'))
  .then(endpoint => {
    if (!endpoint) {
      throw new Error('No such deviceId');
    }
  })
  .then(() => redis.smembers(client, deviceId));
}

// unregisters from receiving notifications
// required:
// * deviceId
// optional
// * features
// if no features provided unregister from all features
function unregister(deviceId, features) {
  console.log('NOT IMPLEMENTED', deviceId, features);
}

// update endpoint for the device
// required:
// * machineId
// * endpoint
function updateEndpoint(deviceId, endpoint) {
  console.log('NOT IMPLEMENTED', deviceId, endpoint);
}

export default {
  register,
  getRegisteredFeatures,
  unregister,
  updateEndpoint,
};

const test = {
  setClient,
};

export { test };
