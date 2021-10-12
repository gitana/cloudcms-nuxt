import path from "path";
import serverMiddleware from "./server-middleware";

module.exports = async function nuxtCloudCMS (moduleOptions) {
    this.addServerMiddleware(await serverMiddleware(moduleOptions));

    this.addPlugin({
        src: path.resolve(__dirname, "./templates/plugin.js"),
        options: {
            storage: this.options.generate.dir,
            ...moduleOptions
        },
        mode: "server"
    });
}

module.exports.meta = require('../package.json');
