import redis from '../engine/redis-helper.js';
import webPush from 'web-push';

const ttl = 2419200;

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
  .then(redisClient => {
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

/*
 * send confirmation even if deviceId is already deleted
 */
function sendConfirmation(endpoint, key, deviceId, features, dbNumber) {
  let payload = { title: 'Registration changed' };
  payload.body = 'You\'re not registered to any feature';
  if (features && features.length > 0) {
    const numberOfFeatures = features.length;
    const message = 'Registered to';
    if (features.indexOf('all') >= 0) {
      payload.body = `${message} all features`;
    } else if (numberOfFeatures === 1) {
      if (features.indexOf('new') === 0) {
        payload.body = `${message} new features only`;
      } else {
        payload.body = `${message} one feature`;
      }
    } else {
      payload.body = `${message} ${numberOfFeatures} features`;
    }
  }
  payload = JSON.stringify(payload);
  return setClient(dbNumber)
  .then(() => {
    if (endpoint.indexOf('https://android.googleapis.com/gcm/send') === 0) {
      return redis.set(client, `${deviceId}-payload`, payload)
      .then(webPush.sendNotification(endpoint, ttl));
    }
    return webPush.sendNotification(endpoint, ttl, key, payload);
  });
}

/*
 * send confirmation after user changed registration
 * deviceId might be an endpoint
 */
function sendConfirmationToDevice(deviceId, dbNumber) {
  return setClient(dbNumber)
  .then(() => checkDeviceId(deviceId, dbNumber))
  .then(() => redis.hgetall(client, `device-${deviceId}`))
  .then(device =>
    getRegisteredFeatures(deviceId, dbNumber)
    .then(features => sendConfirmation(device.endpoint, device.key, deviceId, features, dbNumber))
  );
}

function unregisterDevice(deviceId) {
  return redis.del(client, `device-${deviceId}`)
  .then(() => redis.smembers(client, `${deviceId}-notifications`))
  .then(deviceFeatures => Promise.all(
        deviceFeatures.map(slug => redis.srem(client, `${slug}-notifications`, deviceId))
  ))
  .then(() => redis.del(client, `${deviceId}-notifications`));
}

// unregisters from receiving notifications
// required:
// * deviceId
// optional
// * features
// if no features provided unregister from all features and delete
// endpoint entry
function unregister(deviceId, features, dbNumber, doNotConfirm) {
  let endpoint;
  let key;
  return checkDeviceId(deviceId, dbNumber)
  .then(() => redis.hgetall(client, `device-${deviceId}`))
  .then(device => {
    endpoint = device.endpoint;
    key = device.key;
  })
  .then(() => {
    if (!features) {
      return unregisterDevice(deviceId);
    }
    return redis.sismember(client, `${deviceId}-notifications`, 'all')
    .then(registeredToAll => {
      if (!registeredToAll) {
        return Promise.all(features.map(slug => [
          redis.srem(client, `${slug}-notifications`, deviceId),
          redis.srem(client, `${deviceId}-notifications`, slug)])
        );
      }
      // user decided to unregister from `all`
      if (features.indexOf('all') >= 0) {
        return redis.srem(client, 'all-notifications', deviceId)
        .then(() => redis.srem(client, `${deviceId}-notifications`, 'all'));
      }
      // unregister from `all` and register to negative of `features`
      return redis.srem(client, 'all-notifications', deviceId)
      .then(() => redis.srem(client, `${deviceId}-notifications`, 'all'))
      // register to everything except of features
      .then(() => redis.get(client, 'status'))
      .then(status => {
        let allFeatures = ['new'];
        allFeatures = allFeatures.concat(Object.keys(JSON.parse(status)));
        return Promise.all(allFeatures.map(slug => {
          if (features.indexOf(slug) >= 0) {
            return Promise.resolve();
          }
          return redis.sadd(client, `${deviceId}-notifications`, slug)
          .then(() => redis.sadd(client, `${slug}-notifications`, deviceId));
        }));
      });
    });
  })
  .then(() => getRegisteredFeatures(deviceId, dbNumber))
  .catch(err => {
    if (err.message !== 'Not Found') {
      throw err;
    }
    return [];
  })
  .then(regFeatures => {
    if (!doNotConfirm && endpoint) {
      return sendConfirmation(endpoint, key, deviceId, regFeatures, dbNumber)
      .then(() => regFeatures);
    }
    return regFeatures;
  });
}

// Registers to all notifications including new ones
// Removes registrations to individual features
function registerToAll(deviceId, dbNumber) {
  return getRegisteredFeatures(deviceId, dbNumber)
  .then(features => unregister(deviceId, features, dbNumber, true))
  .then(() => Promise.all([
    redis.sadd(client, 'all-notifications', deviceId),
    redis.sadd(client, `${deviceId}-notifications`, 'all')]));
}

// registers to receive notifications
// required info:
// * deviceId
// * list of feature slugs to register to
//   special features are `new` and `all`
//   * new - do notify about new features
//   * all - all features including new, registering to all will remove
//     all individual registrations
// * endpoint [optional]
// one can register to a feature without providing an endpoint
// if it was already saved:
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
  .then(() => {
    if (features.indexOf('all') >= 0) {
      return registerToAll(deviceId, dbNumber);
    }
    return Promise.all(
      features.map(slug => [
        redis.sadd(client, `${slug}-notifications`, deviceId),
        redis.sadd(client, `${deviceId}-notifications`, slug)]));
  })
  .then(() => sendConfirmationToDevice(deviceId, dbNumber))
  .then(() => getRegisteredFeatures(deviceId, dbNumber));
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

function sendNotifications(feature, payload, isNew, dbNumber) {
  // make payload a string
  if (payload && Object.keys(payload).length > 0) {
    payload = JSON.stringify(payload);
  }
  return setClient(dbNumber)
  .then(() => redis.smembers(client, `${feature}-notifications`))
  .then(devices => redis.smembers(client, 'all-notifications')
    .then(all => devices.concat(all)))
  .then(devices => {
    if (isNew) {
      return redis.smembers(client, 'new-notifications')
      .then(fresh => devices.concat(fresh));
    }
    return devices;
  })
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
