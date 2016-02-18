// notifications.js
import { default as localforage } from 'localforage';

let deviceId;
const subscribeButton = document.getElementById('subscribeAll');

function reloadUI(features) {
  console.log('YYY', features);
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
    })
    .then(response => response.json())
    .then(reloadUI);
  });
}


// generate a random string (default: 40)
function makeId(length) {
  const arr = new Uint8Array((length || 40) / 2);
  window.crypto.getRandomValues(arr);
  return [].map.call(arr, n => n.toString(16)).join('');
}

subscribeButton.onclick = function registerAll() {
  register('all');
}

window.onload = () => {
  if (!navigator.serviceWorker) {
    console.log('No service workers allowed');
    return;
  }

  localforage.getItem('deviceId')
  .then(id => {
    if (id) {
      deviceId = id;
    } else {
      deviceId = makeId(20);
      localforage.setItem('deviceId', deviceId);
    }
  });
};
