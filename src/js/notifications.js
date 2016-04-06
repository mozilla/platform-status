import { default as localforage } from 'localforage';

let deviceId;

function resetNotifications(onclickCallback) {
  const notifications = document.querySelectorAll('.notification');
  for (let i = 0; i < notifications.length; i++) {
    const notification = notifications[i];
    if (onclickCallback) {
      notification.onclick = onclickCallback;
    }
    notification.dataset.notification = false;
    const icon = notification.firstElementChild;
    icon.classList.remove('icon-notify-on');
    icon.classList.add('icon-notify-off');
  }
}

function receiveAllNotificationsUI() {
  const notifications = document.querySelectorAll('.notification');
  for (let i = 0; i < notifications.length; i++) {
    const notification = notifications[i];
    notification.dataset.notification = true;
    const icon = notification.firstElementChild;
    icon.classList.remove('icon-notify-off');
    icon.classList.add('icon-notify-on');
  }
}

function reloadUI(response) {
  console.log('DEBUG - setting notification for', response.features);
  resetNotifications();
  if (response.features.indexOf('all') >= 0) {
    return receiveAllNotificationsUI();
  }
  for (let i = 0; i < response.features.length; i++) {
    const feature = response.features[i];
    const featureElement = document.getElementById(`notification-${feature}`);
    if (featureElement) {
      const icon = featureElement.firstElementChild;
      featureElement.dataset.notification = true;
      icon.classList.remove('icon-notify-off');
      icon.classList.add('icon-notify-on');
    } else {
      console.log('DEBUG: No such element', feature);
    }
  }
}

// unregisters from entire platatus - no notification should be received
function markUnregistered() {
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
        // this lines are necessary to satisfy eslint
        if (!response) {
          return null;
        }
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
    const rawKey = subscription.getKey ? subscription.getKey('p256dh') : '';
    const key = rawKey ?
              btoa(String.fromCharCode.apply(null, new Uint8Array(rawKey))) :
              '';
    const rawAuthSecret = subscription.getKey ? subscription.getKey('auth') : '';
    const authSecret = rawAuthSecret ?
              btoa(String.fromCharCode.apply(null, new Uint8Array(rawAuthSecret))) :
              '';

    return fetch('/register', {
      method: 'post',
      headers: { 'Content-type': 'application/json' },
      body: JSON.stringify({
        deviceId,
        endpoint: subscription.endpoint,
        key,
        authSecret,
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

function toggleNotification(event) {
  const notificationElement = event.target;
  const feature = notificationElement.dataset.slug;
  // sometimes a click to `undefined` happened
  if (feature) {
    if (notificationElement.dataset.notification === 'true') {
      console.log('DEBUG: Unregistering from', feature);
      return unregister(feature);
    }
    console.log('DEBUG: Registering to', feature);
    register(feature);
  }
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
//
// subscribeButton.onclick = function registerAll() {
//   register('all');
// };
//
// unsubscribeButton.onclick = function unRegisterAll() {
//   unregister();
// };

window.onload = () => {
  if (!navigator.serviceWorker) {
    console.log('No service workers allowed');
    return;
  }

  resetNotifications(toggleNotification);

  localforage.getItem('deviceId')
  .then(id => {
    if (id) {
      deviceId = id;
      loadRegistrations();
    } else {
      deviceId = makeId(20);
      localforage.setItem('deviceId', deviceId);
    }
  });
};
