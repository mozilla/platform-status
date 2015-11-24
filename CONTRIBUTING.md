# Contributing

## Adding a Feature

The easiest way to add a new feature is to use github's online file editor and create a new pull request from there.

1. Create a [new file](https://github.com/mozilla/platatus/new/master/features) in the `features` folder and name it to reflect the feature name. The filename should end with the `.md` extension, be short, be descriptive, be lowercase, and use-dashes-for-spaces.
1. Copy the contents [feature-template.md](https://github.com/mozilla/platatus/blob/master/feature-template.md) into the file.
1. Fill as many values (documented below) as possible in `<the-feature>.md`.
1. Create a pull request from the online editor, or if you're using git from the command line follow the usual steps for making a pull request.

| Property       | Required | Description                                                                                                                                                                                            |
|----------------|----------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| title          | ✓        | Short descriptive title                                                                                                                                                                                |
| firefox_status | ✓        | Either the version number of Firefox that the feature was shipped in or 'unknown', 'not-planned', 'deprecated', 'under-consideration', 'in-development'                                                |
| bugzilla       |          | Tracking bug ID from https://bugzilla.mozilla.org/                                                                                                                                                     |
| mdn_url        |          | URL to documentation on the Mozilla Developer Network                                                                                                                                                  |
| spec_url       |          | URL to the specification                                                                                                                                                                               |
| caniuse_ref    |          | Corresponding name used by caniuse from the url after 'feat=' e.g. http://caniuse.com/#feat=promises                                                                                                   |
| webkit_ref     |          | Corresponding 'title' property from https://svn.webkit.org/repository/webkit/trunk/Source/WebCore/features.json or https://svn.webkit.org/repository/webkit/trunk/Source/JavaScriptCore/features.json  |
| chrome_ref     |          | Corresponding 'id' property from https://www.chromestatus.com/features.json                                                                                                                            |
| ie_ref         |          | Corresponding 'name' property from https://raw.githubusercontent.com/MicrosoftEdge/Status/production/app/static/ie-status.json                                                                         |

## Should We Add Feature X?

This list isn't definitive, but a feature makes a good candidate if any of the following are true:

* a standardization process has started
* major browsers have started implementing it or are experimenting with it
* it has been requested by web designers/developers

## Developing the Site

* Try to work on open issues or create a new issue before starting work.
* Follow the style in the file and make sure to run `gulp lint` and `gulp test`.

## Help

Join the #apps channel on irc.mozilla.org or open an [issue](https://github.com/mozilla/platatus/issues).
