import path from "path";

module.exports = function nuxtCloudCMS (moduleOptions) {
    this.addPlugin({
        src: path.resolve(__dirname, "./templates/plugin.js"),
        options: moduleOptions
    });

    if (this.options.cloudcms)
    {
        return this.options.cloudcms.routes
    }
}

module.exports.meta = require('../package.json');
