// There's an odd issue with eslint-plugin-import here:
// eslint-disable-next-line import/extensions
import lunr from 'lunr';

function loadFeatureData() {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('get', 'search.json');
    xhr.addEventListener('load', ({ target }) => {
      resolve(target.responseText);
    });
    xhr.addEventListener('error', () => {
      reject('failed to load feature data');
    });
    xhr.send();
  });
}

function parseFeatureData(body) {
  return JSON.parse(body);
}

function buildSearchIndex(features) {
  // index schema
  const searchIndex = lunr(function didLoad() {
    this.field('title', { boost: 100 });
    this.field('slug', { boost: 100 });
    this.field('summary', { boost: 10 });
    this.field('category', { boost: 1 });
    this.ref('slug');
  });

  searchIndex.pipeline.remove(lunr.stopWordFilter);

  // ingest documents
  features.forEach((doc) => {
    // quick n dirty html strip. not for security.
    doc.summary = doc.summary.replace(/<[^>]+>/g, '');
    searchIndex.add(doc);
  });

  return searchIndex;
}

export default function initialize() {
  return loadFeatureData()
    .then(parseFeatureData)
    .then(buildSearchIndex);
}
