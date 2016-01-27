import search from './search';

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

search.initialize().then((index) => {
  const queryEl = document.querySelector('.search-input');
  const featureEls = Array.prototype.slice.call(document.querySelectorAll('.feature'));
  const featureListEl = document.querySelector('#features');
  const clearEl = document.querySelector('.search-clear');
  const resultMetaEl = document.querySelector('.results-meta');
  const resultCountEl = document.querySelector('.search-results-count');

  // debounce events
  var searchTimeout;
  function triggerSearch() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(performSearch, 100);
  }

  queryEl.addEventListener('change', triggerSearch);
  queryEl.addEventListener('input', triggerSearch);
  queryEl.addEventListener('keypress', triggerSearch);

  clearEl.addEventListener('click', function (e) {
    e.preventDefault();
    queryEl.value = '';
    performSearch();
    queryEl.focus();
  });

  // If the user has entered a query before the index is ready, do a search now
  if (queryEl.value) {
    performSearch();
  }

  function performSearch() {
    var query = queryEl.value;

    featureEls.forEach(function (el) {
      el.classList.remove('match');
      el.style.order = null;
    });

    if (query) {
      var results = index.search(query);
      resultsMeta(results.length);
      if (results.length) {
        results.forEach(function (result, i) {
          var el = document.getElementById(result.ref);
          el.classList.add('match');
          el.style.order = i;
        });
      }
      featureListEl.classList.add('searched');
    } else {
      resultsMeta();
      featureListEl.classList.remove('searched');
    }
  }

  function resultsMeta(n) {
    if (n === undefined) {
      resultMetaEl.style.display = 'none';
      return;
    }
    resultMetaEl.style.display = 'block';
    if (n === 0) {
      resultCountEl.innerHTML = 'No results.';
    }
    if (n === 1) {
      resultCountEl.innerHTML = 'Showing one result.';
    }
    if (n > 1) {
      resultCountEl.innerHTML = 'Showing ' + n + ' results.';
    }
  }
}).catch(function (err) {
  console.error(err);
});

window.ga = window.ga || function() {
  (ga.q = ga.q || []).push(arguments);
}
ga.l = +new Date;
ga('create', 'UA-49796218-38', 'auto');
ga('send', 'pageview');
