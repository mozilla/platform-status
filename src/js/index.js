/* global ga */
import search from './search';
import refreshOnUpdate from './refresh-on-update';
import debounce from 'lodash.debounce';

refreshOnUpdate();

search().then((index) => {
  const queryEl = document.querySelector('.search-input');
  const featureListEl = document.querySelector('#features');

  function clearMatches(references) {
    Array.from(document.querySelectorAll('.feature.match')).forEach((el) => {
      if (references.indexOf(el.id) === -1) {
        el.classList.remove('match');
        el.style.order = null;
      }
    });
  }

  function performSearch() {
    const query = queryEl.value;
    if (query) {
      const results = index.search(query).map(result => result.ref);
      clearMatches(results);
      if (results.length) {
        results.forEach((result, i) => {
          const el = document.getElementById(result);
          el.classList.add('match');
          el.style.order = i;
        });
      }
      featureListEl.classList.add('searched');
    } else {
      clearMatches();
      featureListEl.classList.remove('searched');
    }
  }

  const debounceSearch = debounce(performSearch, 150, {
    maxWait: 750,
  });
  queryEl.addEventListener('change', debounceSearch);
  queryEl.addEventListener('input', debounceSearch);
  queryEl.addEventListener('keypress', debounceSearch);

  // If the user has entered a query before the index is ready, do a search now
  if (queryEl.value) {
    performSearch();
  }
}).catch((err) => {
  console.error(err);
});

window.ga = window.ga || function ga() {
  (ga.q = ga.q || []).push(arguments);
};
ga.l = Date.now();

ga('create', 'UA-49796218-38', 'auto');
ga('send', 'pageview');
