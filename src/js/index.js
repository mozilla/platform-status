(function() {
  if (location.hostname !== 'localhost' && location.protocol !== 'https:') {
    location.href = location.href.replace(/^http/, 'https');
    return;
  }
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('offline-worker.js').then(function(registration) {
      console.log('offline worker registered');;
    });
  }
})();
