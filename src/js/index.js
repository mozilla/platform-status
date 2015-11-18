if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('offline-worker.js').then(() => {
    console.log('offline-worker.js registered');
  });
}
