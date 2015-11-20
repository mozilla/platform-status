if ('serviceWorker' in navigator) {
  const started = Date.now();
  let shouldUpdate = true;
  function didUpdate() {
    if (!shouldUpdate) {
      return;
    }
    shouldUpdate = false;
    // Only show the prompt if there is currently a controller
    // so it is not shown on first load.
    if (!navigator.serviceWorker.controller) {
      return;
    }
    if (Date.now() - started < 5000) {
      console.log('Reloading to activate updated worker.');
      location.reload();
    } else {
      console.log('Not reloading, loaded too long..');
    }
  }
  if (navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.addEventListener('statechange', ({target}) => {
      console.log('sw.controller.onstatechange "%s"', target.state);
      if (target.state === 'redundant') {
        didUpdate();
      }
    });
  }

  navigator.serviceWorker.register('offline-worker.js')
    .then((registration) => {
      console.log('offline-worker.js registered');
      return new Promise((resolve) => {
        registration.addEventListener('updatefound', resolve);
      });
    })
    .then(({target}) => {
      const {installing} = target;
      console.log('registration.onupdatefound');
      // Wait for the new service worker to be installed before
      // prompting to update.
      return new Promise((resolve) => {
        installing.addEventListener('statechange', resolve);
      });
    })
    .then(({target}) => {
      console.log('registration.installing.onstatechange state "%s"', target.state);
      if (target.state !== 'installed') {
        return;
      }
      didUpdate();
    });
}
