import * as cloudcms from 'cloudcms';
import fs from 'fs';
import { join } from 'path';
import mime from 'mime-types';

let session = null;
let savedAttachments = {};

export function startCloudCMSSession() {
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
export async function createAttachmentLink(repository, branch, nodeId, attachmentId) {
    const repositoryId = session.acquireId(repository);
    const branchId = session.acquireId(branch);

    const assetPath = "_cloudcms";
    if (!attachmentId) {
        attachmentId = "default";
    }

    const tokenStr = `${repositoryId}/${branchId}/${nodeId}/${attachmentId}`;

    // check if attachment already downloaded
    if (savedAttachments[tokenStr]) {
        return savedAttachments[tokenStr];
    }

    let newPath = `/${assetPath}/${tokenStr}`;
    if (process.env.NODE_ENV === 'production') {
        const fileLoc = join("<%= options.storage %>", assetPath, repositoryId, branchId, nodeId);
        if (!fs.existsSync(fileLoc)) {
            fs.mkdirSync(fileLoc, { recursive: true });
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

const build_branch = async function (context) {
    const repositoryId = context.repositoryId || process.env.repositoryId;
    const branchId = context.branchId || process.env.branchId;

    let branch = await context.$cloudcms.readBranch(repositoryId, branchId);
    branch.createAttachmentLink = context.$cloudcms.createAttachmentLink.bind(branch, repositoryId, branchId);
    
    return branch;
};

const extendSession = function (session) {
    const bindExtraProperties_row = async (repository, branch, row) => {
        try {
            row.defaultAttachmentUrl = await session.createAttachmentLink(repository, branch, row._doc);
        } catch (e) {
            // swallow
        }
    }

    const bindExtraProperties_response = async (repository, branch, response) => {
        if (response && response.rows) {
            // Bind extra properties for all rows in the response
            const tasks = response.rows.map(row => bindExtraProperties_row(repository, branch, row))
            await Promise.all(tasks);
        }
    }

    // Rebind functions which fetch nodes so that extra properties can also be fetched
    const readNode = session.readNode;
    session.readNode = async (repository, branch, nodeId, path, callback) => {
        let node = await readNode.call(session, repository, branch, nodeId, path, callback);
        await bindExtraProperties_row(repository, branch, node);
        return node;
    };
    const queryNodes = session.queryNodes;
    session.queryNodes = async (repository, branch, query, pagination, callback) => {
        let response = await queryNodes.call(session, repository, branch, query, pagination, callback);
        await bindExtraProperties_response(repository, branch, response);
        return response;
    };
    const searchNodes = session.searchNodes;
    session.searchNodes = async (repository, branch, search, pagination, callback) => {
        let response = await searchNodes.call(session, repository, branch, search, pagination, callback);
        await bindExtraProperties_response(repository, branch, response);
        return response;
    };
    const findNodes = session.findNodes;
    session.findNodes = async (repository, branch, config, pagination, callback) => {
        let response = await findNodes.call(session, repository, branch, config, pagination, callback);
        await bindExtraProperties_response(repository, branch, response);
        return response;
    };

    session.createAttachmentLink = createAttachmentLink;

    return session;
}


export default async function (context, inject) {

    session = await startCloudCMSSession();
    session = extendSession(session);
    context.$cloudcms = session;

    const branch = await build_branch(context);
    context.$branch = branch;

    inject("cloudcms", session);
    inject("branch", branch);
};