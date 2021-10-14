# Cloud CMS Nuxt Module

This module makes it easy to use Cloud CMS from within your Nuxt JS pages and components.
It does so by exposing the [Cloud CMS Javascript Driver](https://github.com/gitana/cloudcms-javascript-driver) 
via helper methods and making it easy to provide API configuration.

You can find an example of static site generated using Nuxt JS and Cloud CMS here: https://github.com/gitana/sdk/tree/master/nuxtjs/sample

### Installation

`npm install -S cloudcms-nuxt`

### Example Usage

```javascript
async asyncData(context) {
    let node = await context.$cloudcms.readNode(process.env.repositoryId, process.env.branchId, "myNodeId");
    // more awesome content functions
}
```
