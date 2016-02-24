import redis from '../engine/redis-helper.js';
import webPush from 'web-push';

if (!process.env.GCM_API_KEY) {
  console.warn('Set the GCM_API_KEY environment variable to support GCM');
}
webPush.setGCMAPIKey(process.env.GCM_API_KEY);

// there is only one client (useful especially while testing)
let client;
function setClient(dbNumber) {
  if (client) {
    return Promise.resolve(client);
  }
  return redis.getClient(dbNumber)
  .then((redisClient) => {
    client = redisClient;
    return client;
  });
}

// eported only for test as we will not need to kill database
function quitClient(dbNumber) {
  return setClient(dbNumber)
  .then(() => {
    const p = redis.quit(client);
    client = null;
    return p;
  });
}

// check if such device exists in database, reject if not
function checkDeviceId(deviceId, dbNumber) {
  return setClient(dbNumber)
  .then(() => redis.hgetall(client, `device-${deviceId}`))
  .then(device => {
    if (!device || !device.endpoint) {
      throw new Error('Not Found');
    }
  });
}

// get all registrations for a deviceId
function getRegisteredFeatures(deviceId, dbNumber) {
  return checkDeviceId(deviceId, dbNumber)
  .then(() => redis.smembers(client, `${deviceId}-notifications`));
}

// registers to receive notifications
// required info:
// * deviceId
// * list of feature slugs to register to
// optional
// one can register to a feature without providing an endpoint
// if it was already saved:
// * endpoint
// * key
// * dbNumber
function register(deviceId, features, endpoint, key, dbNumber) {
  if (!features || features.length === 0) {
    return Promise.reject(new Error('No features provided'));
  }

  return setClient(dbNumber)
  .then(() => {
    if (endpoint) {
      const device = {
        id: deviceId,
        endpoint,
        key: key || '',
      };
      redis.hmset(client, `device-${deviceId}`, device);
      return device;
    }
    return redis.hgetall(client, `device-${deviceId}`);
  })
  .then(device => {
    if (!device || !device.endpoint) {
      throw new Error('No endpoint provided');
    }
  })
  .then(() => Promise.all(
      features.map(slug => [
        redis.sadd(client, `${slug}-notifications`, deviceId),
        redis.sadd(client, `${deviceId}-notifications`, slug)])))
  .then(() => getRegisteredFeatures(deviceId, dbNumber));
}

// unregisters from receiving notifications
// required:
// * deviceId
// optional
// * features
// if no features provided unregister from all features and delete
// endpoint entry
function unregister(deviceId, features, dbNumber) {
  return checkDeviceId(deviceId, dbNumber)
  .then(() => {
    if (features) {
      return Promise.all(features.map(slug => [
        redis.srem(client, `${slug}-notifications`, deviceId),
        redis.srem(client, `${deviceId}-notifications`, slug)])
      );
    }
    return redis.del(client, `device-${deviceId}`)
    .then(() => redis.smembers(client, `${deviceId}-notifications`))
    .then(deviceFeatures => Promise.all(
          deviceFeatures.map(slug => redis.srem(client, `${slug}-notifications`, deviceId))
    ))
    .then(() => redis.del(client, `${deviceId}-notifications`));
  })
  .then(() => getRegisteredFeatures(deviceId, dbNumber))
  .catch(err => {
    if (err.message !== 'Not Found') {
      throw err;
    }
    return [];
  });
}

// update endpoint for the device
// required:
// * machineId
// * endpoint
function updateEndpoint(deviceId, endpoint, key, dbNumber) {
  if (!endpoint) {
    return Promise.reject(new Error('No endpoint provided'));
  }
  return checkDeviceId(deviceId, dbNumber)
  .then(() => redis.hmset(client, `device-${deviceId}`, 'endpoint', endpoint, 'key', key));
}

const ttl = 2419200;
function sendNotifications(feature, payload, dbNumber) {
  // make payload a string
  if (payload && Object.keys(payload).length > 0) {
    payload = JSON.stringify(payload);
  }
  return setClient(dbNumber)
  .then(() => redis.smembers(client, `${feature}-notifications`))
  .then(devices => redis.smembers(client, 'all-notifications')
    .then(all => devices.concat(all)))
  .then(devices => Promise.all(
        devices.map(deviceId => redis.hgetall(client, `device-${deviceId}`))))
  .then(devices => Promise.all(
      devices.map(device => {
        if (device.endpoint.indexOf('https://android.googleapis.com/gcm/send') === 0) {
          // XXX potential problem if many notifications to the same
          // machine. An idea to fix it: store an array of messages
          // instead. Delete after showing it. If a notifications comes
          // and no payload - just leave it there.
          return redis.set(client, `${device.id}-payload`, payload)
          .then(webPush.sendNotification(device.endpoint, ttl));
        }
        return webPush.sendNotification(device.endpoint, ttl, device.key, payload);
      })
  ));
}

function getPayload(deviceId, dbNumber) {
  return setClient(dbNumber)
  .then(() => redis.get(client, `${deviceId}-payload`))
  .then(payload => redis.del(client, `${deviceId}-payload`)
    .then(() => payload));
}

export default {
  register,
  getRegisteredFeatures,
  unregister,
  updateEndpoint,
  getPayload,
  sendNotifications,
  quitClient,
  setClient,
};

const test = {
};

export { test };
