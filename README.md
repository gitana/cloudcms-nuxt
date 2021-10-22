# Cloud CMS Nuxt Module

This module makes it easy to use Cloud CMS from within your Nuxt JS pages and components.

It provides the following:

1. An initialized connect to Cloud CMS for use in query, search and retrieval of content.
2. Optional support for Preview Mode (providing your editors with instant preview of editorial changes from within Cloud CMS).
3. Optional support for Page Renditions (allowing your editors to see and preview precisely where a piece of content appears on the site).

You can find an example of a static site generated using Nuxt JS and Cloud CMS here: https://github.com/gitana/sdk/tree/master/nuxtjs/sample

This site uses the Cloud CMS Nuxt Module to deliver a working example of the aforementioned capabilities.

## Installation

`npm install -S cloudcms-nuxt`

## Nuxt

Add the module to your Nuxt configuration.  You must include the contents of your `gitana.json` file, like this:

```
var config = require("./gitana.json");
module.exports = {
    ...,
    "modules": [
        ["cloudcms-nuxt", config]
    ]
}
```

You can also add the following optional configuration settings:

```
{
    ...,
    "preview": false,
    "renditions": false,
    "basePageUrl": "http://localhost:3000"
}
```

In more detail, these are:

- *preview* - set to `true` to enable instant preview and branch switching capabilities
- *renditions* - set to `true` to track generated page renditions (per content item) and make that information available to editors for preview selection
- *basePageUrl* - set to the base URL of the server for instant preview
- 

## Example Usage

The `$cloudcms` context variable is available on the `context`.  Here is how you can read a node.

```javascript
async asyncData(context) {
    let node = await context.$cloudcms.readNode(process.env.repositoryId, process.env.branchId, "myNodeId");
    // more awesome content functions
}
```

If you've enabled preview mode (i.e. `preview` set to `true` via config), then your web pages support the following 
additional request parameters:

    ?preview&branch={branchId}

Which allows you to request server-side rendering of the given page on top of the given Cloud CMS branch.  This provides
your editors (working in different branches) with the ability to preview their content without any server redeployments
or restarts.

If you've enabled rendition tracking (i.e. `trackRenditions` set to `true` via config), then the `nuxt generate` build
for the static site will automatically discover any content node IDs for every page generated.  That information will
be shipped back to the Cloud CMS API so that your editorial users can take advantage of it while editing and previewing
their changes.

To tag pages as having generated using a specific node, just append the `data-cms-id` attribute into your DOM.  For example,

    <div class="item item-author-block author" :data-cms-id="author._doc">
        <a :href="authorLink">
            <div class="author-dp">
                <img v-bind:src="author.defaultAttachmentUrl" v-bind:alt="author.title">
            </div>
        </a>
    </div>
