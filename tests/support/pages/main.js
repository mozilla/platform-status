define(function() {
  // the page object is created as a constructor
  // so we can provide the remote Command object
  // at runtime
  function IndexPage(remote) {
    this.remote = remote.get(require.toUrl('dist/public/index.html'));
  }

  IndexPage.prototype = {
    constructor: IndexPage,

    // Returns a promise that resolves to the title of the page
    get title() {
      return this.remote.getPageTitle();
    },

    followRepoLink() {
      const remote = this.remote;

      return remote.findByCssSelector('#link-repo').then(function(anchor) {
        return anchor.getProperty('href').then(function(url) {
          return remote.get(url);
        });
      });
    },

    followFileIssueLink() {
      const remote = this.remote;

      return remote.findByCssSelector('#link-issue').then(function(anchor) {
        return anchor.getProperty('href').then(function(url) {
          return remote.get(url);
        });
      });
    },
  };

  return IndexPage;
});
