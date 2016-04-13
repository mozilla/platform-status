import redis from '../engine/redis-helper.js';
import webPush from 'web-push';

if (!process.env.GCM_API_KEY) {
  console.warn('Set the GCM_API_KEY environment variable to support GCM');
}
webPush.setGCMAPIKey(process.env.GCM_API_KEY);

// check if such device exists in database, reject if not
function checkDeviceId(deviceId) {
  return redis.hgetall(`device-${deviceId}`)
  .then(device => {
    if (!device || !device.endpoint) {
      throw new Error('Not Found');
    }
  });
}

// get all registrations for a deviceId
function getRegisteredFeatures(deviceId) {
  return checkDeviceId(deviceId)
  .then(() => redis.smembers(`${deviceId}-notifications`));
}

function sendWebPush(device, payload) {
  if (typeof payload !== 'object') {
    return Promise.reject(new Error(`payload "${payload}" needs to be an object`));
  }
  payload = JSON.stringify(payload);
  if (device.key) {
    return webPush.sendNotification(device.endpoint, {
      userPublicKey: device.key,
      userAuth: device.auth || '',
      payload,
    });
  }
  return redis.set(`${device.id}-payload`, payload)
  .then(() =>
    webPush.sendNotification(device.endpoint)
  );
}

/*
 * send confirmation even if deviceId is already deleted
 */
function sendConfirmation(device, features) {
  const payload = {
    title: 'Registration changed',
    body: 'You\'re not registered to any feature',
  };
  if (features && features.length > 0) {
    const numberOfFeatures = features.length;
    const message = 'Registered to';
    if (features.indexOf('all') >= 0) {
      payload.body = `${message} all features`;
    } else if (features.indexOf('new') >= 0) {
      payload.body = `${message} new features only`;
    } else if (numberOfFeatures === 1) {
      payload.body = `${message} one feature`;
    } else {
      payload.body = `${message} ${numberOfFeatures} features`;
    }
  }
  return sendWebPush(device, payload);
}

function unregisterDevice(deviceId) {
  return redis.del(`device-${deviceId}`)
  .then(() => redis.smembers(`${deviceId}-notifications`))
  .then(deviceFeatures => Promise.all(
        deviceFeatures.map(slug => redis.srem(`${slug}-notifications`, deviceId))
  ))
  .then(() => redis.del(`${deviceId}-notifications`));
}

// unregisters from receiving notifications
// required:
// * deviceId
// optional
// * features
// if no features provided unregister from all features and delete
// endpoint entry
function unregister(deviceId, features, doNotConfirm) {
  let endpoint;
  let key;
  let authSecret;
  return checkDeviceId(deviceId)
  .then(() => redis.hgetall(`device-${deviceId}`))
  .then(device => {
    endpoint = device.endpoint;
    key = device.key;
    authSecret = device.authSecret;
  })
  .then(() => {
    if (!features) {
      return unregisterDevice(deviceId);
    }
    return redis.sismember(`${deviceId}-notifications`, 'all')
    .then(registeredToAll => {
      if (!registeredToAll) {
        return Promise.all(features.map(slug => [
          redis.srem(`${slug}-notifications`, deviceId),
          redis.srem(`${deviceId}-notifications`, slug)])
        );
      }
      // user decided to unregister from `all`
      if (features.indexOf('all') >= 0) {
        return redis.srem('all-notifications', deviceId)
        .then(() => redis.srem(`${deviceId}-notifications`, 'all'));
      }
      // unregister from `all` and register to negative of `features`
      return redis.srem('all-notifications', deviceId)
      .then(() => redis.srem(`${deviceId}-notifications`, 'all'))
      // register to everything except of features
      .then(() => redis.get('status'))
      .then(status => {
        let allFeatures = ['new'];
        allFeatures = allFeatures.concat(Object.keys(JSON.parse(status)));
        return Promise.all(allFeatures.map(slug => {
          if (features.indexOf(slug) >= 0) {
            return Promise.resolve();
          }
          return redis.sadd(`${deviceId}-notifications`, slug)
          .then(() => redis.sadd(`${slug}-notifications`, deviceId));
        }));
      });
    });
  })
  .then(() => getRegisteredFeatures(deviceId))
  .catch(err => {
    if (err.message !== 'Not Found') {
      throw err;
    }
    return [];
  })
  .then(regFeatures => {
    if (!doNotConfirm && endpoint) {
      return sendConfirmation({
        endpoint,
        key,
        authSecret,
        id: deviceId,
      }, regFeatures)
      .then(() => regFeatures);
    }
    return regFeatures;
  });
}

// Registers to all notifications including new ones
// Removes registrations to individual features
function registerToAll(deviceId) {
  return getRegisteredFeatures(deviceId)
  .then(features => unregister(deviceId, features, true))
  .then(() => Promise.all([
    redis.sadd('all-notifications', deviceId),
    redis.sadd(`${deviceId}-notifications`, 'all')]));
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
function register(deviceId, features, endpoint, key, authSecret) {
  if (!features || features.length === 0) {
    return Promise.reject(new Error('No features provided'));
  }

  return Promise.resolve()
  .then(() => {
    if (endpoint) {
      const device = {
        id: deviceId,
        endpoint,
        key: key || '',
        authSecret: authSecret || '',
      };
      return redis.hmset(`device-${deviceId}`, device)
      .then(() => device);
    }
    return redis.hgetall(`device-${deviceId}`);
  })
  .then(device => {
    if (!device || !device.endpoint) {
      throw new Error('No endpoint provided');
    }
    if (features.indexOf('all') >= 0) {
      return registerToAll(deviceId)
      .then(() => device);
    }
    return Promise.all(
      features.map(slug => [
        redis.sadd(`${slug}-notifications`, deviceId),
        redis.sadd(`${deviceId}-notifications`, slug)])
    )
    .then(() => device);
  })
  .then(device => getRegisteredFeatures(device.id)
    .then(regFeatures => sendConfirmation(device, features)
      .then(() => regFeatures))
  );
}

// update endpoint for the device
// required:
// * machineId
// * endpoint
function updateDevice(deviceId, endpoint, key, authSecret) {
  if (!endpoint) {
    return Promise.reject(new Error('No endpoint provided'));
  }
  return checkDeviceId(deviceId)
  .then(() => redis.hmset(`device-${deviceId}`,
                          'endpoint', endpoint,
                          'key', key, 'authSecret', authSecret || ''));
}

function sendNotifications(feature, payload, isNew) {
  if (!payload) {
    return Promise.reject(new Error('No payload provided'));
  }
  return redis.smembers(`${feature}-notifications`)
  .then(devices =>
    redis.smembers('all-notifications')
    .then(all => devices.concat(all))
  )
  .then(devices => {
    if (isNew) {
      return redis.smembers('new-notifications')
      .then(fresh => devices.concat(fresh));
    }
    return devices;
  })
  .then(devices => Promise.all(
        devices.map(deviceId => redis.hgetall(`device-${deviceId}`))))
  .then(devices => Promise.all(
    // XXX potential problem if many notifications to the same
    // machine. An idea to fix it: store an array of messages
    // instead. Delete after showing it. If a notifications comes
    // and no payload - just leave it there.
    devices.map(device => sendWebPush(device, payload))
  ));
}

function getPayload(deviceId) {
  return redis.get(`${deviceId}-payload`)
  .then(payload =>
    redis.del(`${deviceId}-payload`)
    .then(() => JSON.parse(payload))
  );
}

export default {
  register,
  getRegisteredFeatures,
  unregister,
  updateDevice,
  getPayload,
  sendNotifications,
};

const test = {
};

export { test };
