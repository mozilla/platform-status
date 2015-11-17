/* vim: set filetype=javascript sw=2 tw=80 : */

define(function() {
  // the page object is created as a constructor
  // so we can provide the remote Command object
  // at runtime
  function IndexPage(remote) {
    this.remote = remote.get(require.toUrl('dist/index.html'));
  }

  IndexPage.prototype = {
    constructor: IndexPage,

    // Returns a promise that resolves to the title of the page
    get title() {
      return this.remote.getPageTitle();
    },

    get followFileIssueLink() {
      const remote = this.remote;

      return remote.findByTagName('body').then(function(body) {
        return body.findByTagName('footer').then(function(footer) {
          return footer.findByTagName('a').then(function(anchor) {
            return anchor.getProperty('href').then(function(url) {
              return remote.get(url);
            });
          });
        });
      });
    },
  };

  return IndexPage;
});
