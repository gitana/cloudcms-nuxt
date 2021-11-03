import path from "path";
import serverMiddleware from "./server-middleware";
import * as cloudcms from 'cloudcms';

module.exports = async function nuxtCloudCMS(config) {

    // defaults
    if (!config) {
        config = {};
    }
    if (!config.basePageUrl) {
        config.basePageUrl = "http://localhost:3000";
    }
    
    // always include context.$cloudcms
    await addDriverSupport.call(this, config);
    
    // track renditions?
    if (config.renditions)
    {
        addTrackerSupport.call(this, config);
    }
    
    // preview support?
    if (config.preview)
    {
        addPreviewSupport.call(this, config);
    }
    
}

var addDriverSupport = async function(config)
{
    this.addServerMiddleware(await serverMiddleware(config));
    
    this.addPlugin({
        src: path.resolve(__dirname, "./plugins/cloudcms.server.js"),
        options: {
            storage: this.options.generate.dir,
            ...config
        }
    });
}

var addPreviewSupport = function(config)
{
    // adds in preview support
    this.addPlugin({
        src: path.resolve(__dirname, "./plugins/preview.client.js"),
        options: {
            storage: this.options.generate.dir,
            ...config
        }
    });
    
    // adds in dynamic branching
    this.addPlugin({
        src: path.resolve(__dirname, "./plugins/preview.server.js"),
        options: {
            storage: this.options.generate.dir,
            ...config
        }
    });
    
}

var addTrackerSupport = async function(config)
{
    const session = await cloudcms.connect(config);
    var repositoryId = config.repositoryId || process.env.repositoryId;
    var branchId = config.branchId || process.env.branchId;

    // adds in the tracker middle
    this.nuxt.hook("generate:page", function(page) {
        
        const pageTrack = {
            path: page.path,
            html: page.html
        }
        
        session.trackPage(repositoryId, branchId, pageTrack);
    });
}

module.exports.meta = require('../package.json');
