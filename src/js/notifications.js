import { default as localforage } from 'localforage';

let deviceId;
// const subscribeButton = document.getElementById('subscribeAll');
// const unsubscribeButton = document.getElementById('unsubscribeAll');

if (!document.getElementsByClassName) {
  document.getElementsByClassName = classname => {
    const elArray = [];
    const tmp = document.getElementsByTagName('*');

    const regex = new RegExp(`(^|\\s)${classname}(\\s|$)`);
    for (let i = 0; i < tmp.length; i++) {
      if (regex.test(tmp[i].className)) {
        elArray.push(tmp[i]);
      }
    }
    return elArray;
  };
}

function resetNotifications(onclickCallback) {
  const notifications = document.getElementsByClassName('notification');
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

function reloadUI(response) {
  console.log('DEBUG - setting notification for', response.features);
  resetNotifications();
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
    const key = subscription.getKey ? subscription.getKey('p256dh') : '';

    return fetch('/register', {
      method: 'post',
      headers: { 'Content-type': 'application/json' },
      body: JSON.stringify({
        deviceId,
        endpoint: subscription.endpoint,
        key: key ? btoa(String.fromCharCode.apply(null, new Uint8Array(key))) : '',
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
  if (notificationElement.dataset.notification === 'true') {
    console.log('DEBUG: Unregistering from', feature);
    return unregister(feature);
  }
  console.log('DEBUG: Registering to', feature);
  return register(feature);
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
