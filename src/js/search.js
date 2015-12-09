import lunr from 'lunr';

function loadFeatureData(cb) {
  return new Promise(function (resolve, reject) {
    var xhr = new XMLHttpRequest();
    xhr.open('get', 'status.json');
    xhr.addEventListener('load', function () {
      resolve(this.responseText);
    });
    xhr.addEventListener('error', function () {
      reject('failed to load feature data');
    });
    xhr.send();
  });
}

function parseFeatureData(body) {
  return JSON.parse(body);
}

function buildSearchIndex(data) {

  // index schema
  var searchIndex = lunr(function () {
    this.field('title', { boost: 100 });
    this.field('slug', { boost: 100 });
    this.field('summary', { boost: 10 });
    this.field('category', { boost: 1 });

    this.ref('slug');
  });

  searchIndex.pipeline.remove(lunr.stopWordFilter);

  // ingest documents
  var features = data.features;
  for (var i = 0; i < data.features.length; i++) {
    var doc = data.features[i];
    // quick n dirty html strip. not for security.
    doc.summary = doc.summary.replace(/<[^>]+>/g, '');
    searchIndex.add(doc);
  }

  return searchIndex;
}

function initialize() {
  return loadFeatureData()
          .then(parseFeatureData)
          .then(buildSearchIndex);
}

export default {
  initialize: initialize
};
