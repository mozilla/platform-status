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
      return fetch(`./get_payload/${deviceId}`)
      .then(response => response.json());
    });
  }

  event.waitUntil(
    getPayload()
    .then(data => {
      // TODO add a way to unregister from the back-end
      // data.command (?)
      const title = data ? data.title : 'Platform Status';
      const body = data ? data.body : 'Notification Error';
      console.log('DEBUG: ', body);
      return self.registration.showNotification(title, {
        body,
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
        const key = subscription.getKey ? subscription.getKey('p256dh') : '';

        return fetch('./update_endpoint', {
          method: 'post',
          headers: {
            'Content-type': 'application/json',
          },
          body: JSON.stringify({
            deviceId,
            endpoint: subscription.endpoint,
            key: key ? btoa(String.fromCharCode.apply(null, new Uint8Array(key))) : '',
          }),
        });
      });
    })
  );
});

