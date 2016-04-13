import { default as localforage } from 'localforage';

self.addEventListener('push', event => {
  function getPayload() {
    if (event.data) {
      return Promise.resolve(event.data.json());
    }
    return localforage.getItem('deviceId')
    .then(deviceId => {
      if (!deviceId) {
        return null;
      }
      return fetch(`./payload/${deviceId}`)
      .then(response => response.json());
    });
  }

  event.waitUntil(
    getPayload()
    .then(data => {
      // TODO add a way to unregister from the back-end
      // data.command (?)
      if (!(data && data.title && data.body)) {
        console.log('ERROR: Notification without payload', data, data.title);
        return;
      }
      return self.registration.showNotification(data.title, {
        body: data.body,
        icon: '/images/browsers/firefox_64x64.png',
        actions: [{ title: 'Show Platform Status', action: 'click' }],
      });
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  // This looks to see if the current is already open and
  // focuses if it is
  event.waitUntil(
    self.clients.matchAll()
    .then(clientList => {
      if (clientList.length > 0) {
        return clientList[0].focus();
      }
      return self.clients.openWindow('/');
    })
  );
});

self.addEventListener('pushsubscriptionchange', event => {
  event.waitUntil(
    localforage.getItem('deviceId')
    .then(deviceId => {
      if (!deviceId) {
        return null;
      }

      return self.registration.pushManager.subscribe({ userVisibleOnly: true })
      .then(subscription => {
        const rawKey = subscription.getKey ? subscription.getKey('p256dh') : '';
        const key = rawKey ?
                  btoa(String.fromCharCode.apply(null, new Uint8Array(rawKey))) :
                  '';
        const rawAuthSecret = subscription.getKey ? subscription.getKey('auth') : '';
        const authSecret = rawAuthSecret ?
                  btoa(String.fromCharCode.apply(null, new Uint8Array(rawAuthSecret))) :
                  '';

        return fetch('./update_device', {
          method: 'post',
          headers: {
            'Content-type': 'application/json',
          },
          body: JSON.stringify({
            deviceId,
            endpoint: subscription.endpoint,
            key,
            authSecret,
          }),
        });
      });
    })
  );
});

