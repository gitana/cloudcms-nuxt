/**
 * Server middlware for fetching attachments when using the development server
 * @param {*} config 
 * @returns 
 */
export default async function(config)
{
    const app = require('express')();
    const cloudcms = require('cloudcms');
    
    const session = await cloudcms.connect(config);
    
    app.get('/:repositoryId/:branchId/:nodeId/:filename', async (req, res) => {
    
        // download asset, or send local copy
    
        let attachmentId = req.params.filename;
        if (attachmentId.includes("."))
        {
            attachmentId = attachmentId.split(".")[0];
        }
    
        var result = await session.downloadAttachment(req.params.repositoryId, req.params.branchId, req.params.nodeId, attachmentId);
        result.pipe(res);
    });
    
    return {
        path: '/_cloudcms',
        handler: app
    }
}


