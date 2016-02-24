import { default as localforage } from 'localforage';

let deviceId;
const subscribeButton = document.getElementById('subscribeAll');
const unsubscribeButton = document.getElementById('unsubscribeAll');

function reloadUI(features) {
  console.log('YYY', features);
}

// unregisters from entire platatus - no notification should be received
function markUnregistered() {
  console.log('DEBUG: unregistering');
  return navigator.serviceWorker.ready
  .then(registration => registration.pushManager.getSubscription()
    .then(subscription => {
      if (subscription) {
        return subscription.unsubscribe();
      }
    })
  );
}

function handleRegistrationsResponse(response) {
  function shouldUnregister() {
    if (response.status === 404) {
      return markUnregistered()
      .then(() => {
        console.log('XXX stupid eslint rule');
        return { features: [] };
      });
    }
    return response.json()
    .then(body => {
      if (body.features.length === 0) {
        return markUnregistered()
        .then(() => body);
      }
      return body;
    });
  }
  return shouldUnregister()
  .then(reloadUI);
}

function register(feature) {
  navigator.serviceWorker.ready
  .then(registration => registration.pushManager.getSubscription()
    .then(subscription => {
      if (subscription) {
        // already subscribed to a(nother?) feature
        return subscription;
      }

      return registration.pushManager.subscribe({ userVisibleOnly: true });
    }))
  .then(subscription => {
    const key = subscription.getKey ? subscription.getKey('p256dh') : '';

    return fetch('/register', {
      method: 'post',
      headers: { 'Content-type': 'application/json' },
      body: JSON.stringify({
        deviceId,
        endpoint: subscription.endpoint,
        key,
        features: [feature],
      }),
    });
  })
  .then(handleRegistrationsResponse);
}

function unregister(feature) {
  return fetch('/unregister', {
    method: 'post',
    headers: { 'Content-type': 'application/json' },
    body: JSON.stringify({
      deviceId,
      features: (feature) ? [feature] : null,
    }),
  })
  .then(handleRegistrationsResponse);
}

function loadRegistrations() {
  return fetch(`/registrations/${deviceId}`, {
    method: 'get',
    headers: { 'Content-type': 'application/json' },
  })
  .then(handleRegistrationsResponse);
}

// generate a random string (default: 40)
function makeId(length) {
  const arr = new Uint8Array((length || 40) / 2);
  window.crypto.getRandomValues(arr);
  return [].map.call(arr, n => n.toString(16)).join('');
}

subscribeButton.onclick = function registerAll() {
  register('all');
};

unsubscribeButton.onclick = function unRegisterAll() {
  unregister();
};

window.onload = () => {
  if (!navigator.serviceWorker) {
    console.log('No service workers allowed');
    return;
  }

  localforage.getItem('deviceId')
  .then(id => {
    if (id) {
      console.log('DEBUG Received id:', id);
      deviceId = id;
      loadRegistrations();
    } else {
      deviceId = makeId(20);
      console.log('DEBUG Created id:', deviceId);
      localforage.setItem('deviceId', deviceId);
    }
  });
};
