# Cloud CMS Nuxt Module

This module makes it easy to use Cloud CMS from within your Nuxt JS pages and components.
It does so by exposing the [Cloud CMS Javascript Driver](https://github.com/gitana/gitana-javascript-driver) 
via helper methods and making it easy to provide API configuration.

You can find an example of static site generated using Nuxt JS and Cloud CMS here: https://github.com/gitana/sdk/nuxtjs/sample

### Installation

`npm install -S cloudcms-nuxt`

### Example Usage

```javascript
asyncData(context) {
    return context.$getCloudCMS().then(function({ platform, repository, branch }) {
        // Run Cloud CMS Driver functions here

        return {};
    });
}
```