if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('offline-worker.js').then(function(registration) {
    console.log('offline worker registered');
  });
}
