import * as cloudcms from 'cloudcms';

var fs = require("fs");
var path = require("path");

const hash = function(str, seed = 31) {
    let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
    for (let i = 0, ch; i < str.length; i++) {
        ch = str.charCodeAt(i);
        h1 = Math.imul(h1 ^ ch, 2654435761);
        h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1>>>16), 2246822507) ^ Math.imul(h2 ^ (h2>>>13), 3266489909);
    h2 = Math.imul(h2 ^ (h2>>>16), 2246822507) ^ Math.imul(h1 ^ (h1>>>13), 3266489909);
    return 4294967296 * (2097151 & h2) + (h1>>>0);
};

var buildDispatcher = function(trackerConfig, syncFn) {
    
    var TIMEOUT_MS = 250;
    var QUEUE = [];
    
    var timeout = null;
    
    var send = function()
    {
        // chew off a bit of the queue that we'll send
        var queueLength = QUEUE.length;
        if (queueLength === 0) {
            // we're done
            
            // clear timeout if it's hanging on
            if (timeout) {
                clearTimeout(timeout);
                timeout = null;
            }
            
            return;
        }
        
        // if queue length > 50, we trim back
        if (queueLength > 50) {
            queueLength = 50;
        }
        
        var rows = [];
        for (var i = 0; i < queueLength; i++) {
            rows.push(QUEUE[i]);
        }
        
        // strip down the queue
        QUEUE = QUEUE.slice(queueLength);
        
        // send rows via HTTP
        syncFn(rows, function() {
            console.log("Sent " + rows.length + " rows to API");
            
            // run again right away
            setTimeout(send, 1);
        });
    }
    
    var r = {};
    
    r.push = function(o) {
    
        o.repositoryId = trackerConfig.repositoryId;
        o.branchId = trackerConfig.branchId;

        var row = {};
        row.applicationId = trackerConfig.applicationId;
        row.deploymentKey = trackerConfig.deploymentKey;
        row.object = o;
        
        QUEUE.push(row);
        
        // if not already scheduled, schedule it
        if (!timeout) {
            timeout = setTimeout(send, TIMEOUT_MS);
        }
    };
    
    return r;
};

/**
 * Generates a page cache key for a given page
 */
var generatePageCacheKey = function(request, page)
{
    // request
// *      url,
// *      path, (required)
// *      host,
// *      protocol,
// *      headers,
// *      params
    
    // page
// *      id,
// *      title,
// *      url,
// *      path, (required)
// *      tokens,
// *      attributes
//
    
    // sort request params alphabetically
    var paramNames = [];
    if (request.params) {
        for (var paramName in request.params) {
            paramNames.push(paramName);
        }
    }
    paramNames.sort();
    
    // sort page attributes alphabetically
    var pageAttributeNames = [];
    if (page.attributes) {
        for (var pageAttributeName in page.attributes) {
            pageAttributeNames.push(pageAttributeName);
        }
    }
    pageAttributeNames.sort();
    
    // TODO: headers
    /*
    // sort headers alphabetically
    var headerNames = [];
    for (var headerName in request.headers) {
        headerNames.push(headerName);
    }
    headerNames.sort();
    */
    
    var str = page.path;
    
    // add in param names
    for (var i = 0; i < paramNames.length; i++)
    {
        var paramName = paramNames[i];
        var paramValue = request.params[paramName];
        
        if (typeof(paramValue) !== "undefined" && paramValue !== null)
        {
            str += "&param_" + paramName + "=" + paramValue;
        }
    }
    
    // add in page attribute names
    for (var i = 0; i < pageAttributeNames.length; i++)
    {
        var pageAttributeName = pageAttributeNames[i];
        var pageAttributeValue = page.attributes[pageAttributeName];
        
        if (typeof(pageAttributeValue) !== "undefined" && pageAttributeValue !== null)
        {
            str += "&attr_" + pageAttributeName + "=" + pageAttributeValue;
        }
    }
    
    /*
    // add in header names
    for (var i = 0; i < headerNames.length; i++)
    {
        var headerName = headerNames[i];
        var headerValue = request.headers[headerName];
        str += "&header_" + headerName + "=" + headerValue;
    }
    */
    
    // hand back a hash
    return "" + hash(str);
}

module.exports = function trackerFactory(trackerConfig)
{
    var $cloudcms = null;
    var dispatcher = null;
    
    var buildURL = function(_path) {
        
        if (!_path.startsWith("/")) {
            _path = "/" + _path;
        }

        var _url = _path;
        if (trackerConfig.basePageUrl) {
            _url = trackerConfig.basePageUrl + _path;
        }
        
        return _url;
    };
    
    // some clean up of incoming variables
    if (trackerConfig.basePageUrl) {
        if (!trackerConfig.basePageUrl.toLowerCase().startsWith("http://") && !trackerConfig.basePageUrl.toLowerCase().startsWith("https://")) {
            trackerConfig.basePageUrl = "http://" + trackerConfig.basePageUrl;
        }
        if (trackerConfig.basePageUrl.endsWith("/")) {
            trackerConfig.basePageUrl = trackerConfig.basePageUrl.substring(0, trackerConfig.basePageUrl.length - 1);
        }
    }
    
    var r = {};
    
    /**
     * Connects to Cloud CMS and sets up a Dispatcher.
     * This should be called ahead of using the tracker.
     *
     * @param config
     * @returns {Promise<void>}
     */
    var connect = r.connect = async function()
    {
        var gitanaConfig = null;
        if (trackerConfig.gitanaConfig) {
            gitanaConfig = trackerConfig.gitanaConfig;
        }
        if (!gitanaConfig)
        {
            var configFilePath = path.resolve(path.join(".", "gitana.json"));
            if (fs.existsSync(configFilePath)) {
                gitanaConfig = JSON.parse(fs.readFileSync(configFilePath));
            }
        }
        if (!gitanaConfig) {
            throw new Error("Tracker could not determine a Cloud CMS API Server Connection config");
        }
        
        // connect to cloud cms
        $cloudcms = await cloudcms.connect(gitanaConfig);
        
        // the following are required, let's see if we can work this out from gitanaConfig if not provided
        if (!trackerConfig.repositoryId) {
            trackerConfig.repositoryId = process.env.repositoryId;
        }
        if (!trackerConfig.branchId) {
            trackerConfig.branchId = process.env.branchId;
        }
        if (!trackerConfig.applicationId) {
            trackerConfig.applicationId = gitanaConfig.application;
        }
        if (!trackerConfig.deploymentKey) {
            trackerConfig.deploymentKey = "default";
        }
        
        // sync function
        var syncFn = function ($cloudcms) {
            return function (rows, callback) {
                var uri = "/bulk/pagerenditions";
                var qs = {};
                var payload = {
                    "rows": rows
                };
                
                $cloudcms.post(uri, qs, payload, function (err) {
                    callback();
                });
            }
        }($cloudcms);
        
        dispatcher = buildDispatcher(trackerConfig, syncFn);
    };
    
    
    /**
     * Marks a page cache element as dependent on a set of dependencies.
     *
     * This calls over to Cloud CMS to register a page rendition described by "descriptor" as being dependent on the "dependencies".
     *
     * Request should look like:
     *
     *  {
     *      url,
     *      path, (required)
     *      host,
     *      protocol,
     *      headers,
     *      params
     *  }
     *
     * Page should look like:
     *
     *  {
     *      id,
     *      title,
     *      url,
     *      path, (required)
     *      tokens,
     *      attributes
     *  }
     *
     *  And dependencies should look like:
     *
     *  {
     *      "requires": {
     *         "locale": ["en-US"]
     *      },
     *      "produces": {
     *         "node": ["abc123", "def456"]
     *      }
     *  }
     *
     * @type {Function}
     */
    var track = r.track = function(request, page, dependencies)
    {
        if (!request) {
            request = {};
        }
        
        if (!page) {
            page = {};
        }
        
        // request.path is mandatory
        if (!request.path)
        {
            throw new Error("The incoming request does not have a required 'path' field");
        }
        
        if (!request.id) {
            request.id = request.path;
        }
        if (!request.url) {
            request.url = buildURL(request.path);
        }
        
        // page.path is mandatory
        if (!page.path) {
            throw new Error("The incoming page does not have a required 'path' field");
        }
        
        if (!page.id) {
            page.id = page.path;
        }
        if (!page.url) {
            page.url = buildURL(page.path);
        }
        
        // empty dependencies if not defined
        if (!dependencies) {
            dependencies = {};
        }
        
        // assume a unique cache key for the page
        var pageCacheKey = generatePageCacheKey(request, page);
        
        var renditionObject = {
            "key": pageCacheKey,
            "page": page,
            "pageCacheKey": pageCacheKey,
            "request": request,
            "dependencies": dependencies,
            "active": true,
            "scope": "PAGE"
        };
        
        // push row to dispatcher
        dispatcher.push(renditionObject);
    };
    
    var parse = r.parse = function(html)
    {
        var ids = [];
        
        var text = "" + html.toLowerCase();
        
        var done = false;
        while (!done)
        {
            var i1 = text.indexOf("data-cms-id");
            if (i1 > -1)
            {
                text = text.substring(i1 + 11);
                
                var i2 = text.indexOf("=\"");
                if (i2 == -1) {
                    i2 = text.indexOf("='");
                }
                
                if (i2 > -1)
                {
                    text = text.substring(i2 + 2);
                    
                    var i3 = text.indexOf("\"");
                    if (i3 == -1) {
                        i3 = text.indexOf("'");
                    }
                    
                    if (i3 > -1)
                    {
                        var id = text.substring(0, i3);
                        
                        text = text.substring(i3 + 1);
                        
                        ids.push(id);
                    }
                }
            }
            else
            {
                done = true;
            }
        }
        
        return ids;
    }
    
    var trackPathHtml = r.trackPathHtml = function(path, html)
    {
        var ids = parse(html);
        if (ids && ids.length > 0)
        {
            //console.log("Found ids: " + ids + " for path: " + path);
            
            var request = {
                "path": path
            };
            
            var page = {
                "path": path
            };
            
            var dependencies = {
                "requires": {},
                "produces": {
                    "node": ids
                }
            }
            
            track(request, page, dependencies, function(err) {
                // done
            });
        }
    }
    
    return r;
}