import * as cloudcms from 'cloudcms';

export function startCloudCMSSession()
{
    return cloudcms.connect({
        "clientKey": "<%= options.clientKey %>",
        "clientSecret": "<%= options.clientSecret %>",
        "username": "<%= options.username %>",
        "password": "<%= options.password %>",
        "baseURL": "<%= options.baseURL %>",
        "application": "<%= options.application %>"
    });
}

export default async function(ctx, inject) {

    const session = await startCloudCMSSession();

    ctx.$cloudcms = session;
    inject("cloudcms", session);
};