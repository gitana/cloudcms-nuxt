import * as cloudcms from 'cloudcms';
import fs from 'fs';
import { join } from 'path';
import mime from 'mime-types';

let session = null;
let savedAttachments = {};

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

/**
 * Downloads attachment to build and generates a static path that is accessible from the client
 * @param {*} repositoryId 
 * @param {*} branchId 
 * @param {*} nodeId 
 * @param {*} attachmentId Optional, defaults to "default"
 */
export async function createAttachmentLink(repositoryId, branchId, nodeId, attachmentId)
{
    const assetPath = "_cloudcms";
    if (!attachmentId)
    {
        attachmentId = "default";
    }

    const tokenStr = `${repositoryId}/${branchId}/${nodeId}/${attachmentId}`;

    // check if attachment already downloaded
    if (savedAttachments[tokenStr])
    {
        return savedAttachments[tokenStr];
    }
    
    let newPath = `/${assetPath}/${tokenStr}`;
    if (process.env.NODE_ENV === 'production')
    {
        const fileLoc = join("<%= options.storage %>", assetPath, repositoryId, branchId, nodeId);
        if (!fs.existsSync(fileLoc))
        {
            fs.mkdirSync(fileLoc, {recursive: true});
        }

        let attachment = await session.downloadAttachment(repositoryId, branchId, nodeId, attachmentId);
        const ext = mime.extension(attachment.headers['content-type']);
        newPath += "." + ext;
        savedAttachments[tokenStr] = newPath;
    
        let ws = fs.createWriteStream(join("<%= options.storage %>", newPath));
        attachment.pipe(ws);
    }

    return newPath;
}


export default async function(ctx, inject) {

    session = await startCloudCMSSession();

    ctx.$cloudcms = session;
    ctx.$cloudcms.createAttachmentLink = createAttachmentLink;

    inject("cloudcms", session);
};