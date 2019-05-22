define(() => {
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

      return remote.findByCssSelector('#link-repo')
        .then(anchor => anchor.getProperty('href'))
        .then(url => remote.get(url));
    },

    followFileIssueLink() {
      const remote = this.remote;

      return remote.findByCssSelector('#link-issue')
        .then(anchor => anchor.getProperty('href'))
        .then(url => remote.get(url));
    },
  };

  return IndexPage;
});
