const Gitana = require("gitana");

export function getCloudCMSPlatform() {
    return new Promise(function(resolve, reject) {
        Gitana.connect({
            "clientKey": "<%= options.clientKey %>",
            "clientSecret": "<%= options.clientSecret %>",
            "username": "<%= options.username %>",
            "password": "<%= options.password %>",
            "baseURL": "<%= options.baseURL %>",
            "application": "<%= options.application %>"
        }, function(err) {
            if (err) {
                reject(err);
            }
            else {
                const platform = this;
                resolve({ platform: platform });
            }
        });
    });
};

export function getCloudCMS() {
    return getCloudCMSPlatform().then(function({ platform }) {
        var repository = null;
        if ("<%= options.repositoryId %>")
        {
            repository = platform.readRepository("<%= options.repositoryId %>");
        }
        else
        {
            repository = platform.datastore("content");
        }

        var branch = null;
        if ("<%= options.branchId %>")
        {
            branch = repository.readBranch("<%= options.branchId %>");
        }
        else
        {
            branch = repository.readBranch("master");
        }
        
        return branch.then(function() {
            return {
                platform: platform,
                repository: repository,
                branch: this
            };
        });
    });
}

export default function(ctx, inject) {

    ctx.$getCloudCMSPlatform = getCloudCMSPlatform;
    ctx.$getCloudCMS = getCloudCMS;
    ctx.$baseCDNURL = "<%= options.baseCDNURL %>";

    inject("getCloudCMSPlatform", getCloudCMSPlatform);
    inject("getCloudCMS", getCloudCMS);
    inject("baseCDNURL", "<%= options.baseCDNURL %>");
};