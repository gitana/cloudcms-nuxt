import * as cloudcms from 'cloudcms';
import { UtilitySession } from 'cloudcms';
import fs from 'fs';
import { join } from 'path';
import mime from 'mime-types';

class NuxtSession extends UtilitySession {
    constructor(config, driver, storage)
    {
        super(config, driver, storage);
        this._savedAttachments = {};
    }
    
    async readNode(repository, branch, nodeId, path, callback) {
        let node = await super.readNode(repository, branch, nodeId, path, callback);
        await this.bindExtraProperties_row(repository, branch, node);
        return node;
    }

    async queryNodes(repository, branch, query, pagination, callback) {
        let response = await super.queryNodes(repository, branch, query, pagination, callback);
        await this.bindExtraProperties_response(repository, branch, response);
        return response;
    }

    async searchNodes(repository, branch, search, pagination, callback) {
        let response = await super.searchNodes(repository, branch, search, pagination, callback);
        await this.bindExtraProperties_response(repository, branch, response);
        return response;
    }

    async findNodes(repository, branch, config, pagination, callback) {
        let response = await super.findNodes(repository, branch, config, pagination, callback);
        await this.bindExtraProperties_response(repository, branch, response);
        return response;
    };

    /**
     * Downloads attachment to build and generates a static path that is accessible from the client
     * @param {*} repositoryI
     * @param {*} branch
     * @param {*} node
     * @param {*} attachmentId Optional, defaults to "default"
     */
    async createAttachmentLink(repository, branch, node, attachmentId) {
        const repositoryId = this.acquireId(repository);
        const branchId = this.acquireId(branch);
        const nodeId = this.acquireId(node);

        const assetPath = "_cloudcms";
        if (!attachmentId) {
            attachmentId = "default";
        }

        const tokenStr = `${repositoryId}/${branchId}/${nodeId}/${attachmentId}`;

        // check if attachment already downloaded
        if (this._savedAttachments[tokenStr]) {
            return this._savedAttachments[tokenStr];
        }

        let newPath = `/${assetPath}/${tokenStr}`;
        if (process.env.NODE_ENV === 'production') {
            const fileLoc = join("<%= options.storage %>", assetPath, repositoryId, branchId, nodeId);
            if (!fs.existsSync(fileLoc)) {
                fs.mkdirSync(fileLoc, { recursive: true });
            }

            let attachment = await this.downloadAttachment(repositoryId, branchId, nodeId, attachmentId);
            const ext = mime.extension(attachment.headers['content-type']);
            newPath += "." + ext;
            this._savedAttachments[tokenStr] = newPath;

            let ws = fs.createWriteStream(join("<%= options.storage %>", newPath));
            attachment.pipe(ws);
        }

        return newPath;
    }

    async bindExtraProperties_row(repository, branch, row) {
        try {
            row.defaultAttachmentUrl = await this.createAttachmentLink(repository, branch, row._doc);
        } catch (e) {
            // swallow
        }
    }
    
    async bindExtraProperties_response(repository, branch, response) {
        if (response && response.rows) {
            // Bind extra properties for all rows in the response
            const tasks = response.rows.map(row => this.bindExtraProperties_row(repository, branch, row))
            await Promise.all(tasks);
        }
    }
}

export function startCloudCMSSession() {
    cloudcms.session(NuxtSession);
    return cloudcms.connect({
        "clientKey": "<%= options.clientKey %>",
        "clientSecret": "<%= options.clientSecret %>",
        "username": "<%= options.username %>",
        "password": "<%= options.password %>",
        "baseURL": "<%= options.baseURL %>",
        "application": "<%= options.application %>"
    });
}

const build_branch = async function (context) {
    let repositoryId = context.repositoryId || process.env.repositoryId;
    let branchId = context.branchId || process.env.branchId || "master";

    // Fallback to using application repo
    if (!repositoryId)
    {
        repositoryId = (await context.$cloudcms.repository())._doc;
    }

    let branch = await context.$cloudcms.readBranch(repositoryId, branchId);
    branch = context.$cloudcms.wrapBranch(repositoryId, branch);
    branch.createAttachmentLink = context.$cloudcms.createAttachmentLink.bind(context.$cloudcms, repositoryId, branchId);
    
    return branch;
};

export default async function (context) {

    let session = await startCloudCMSSession();
    // session = extendSession(session);
    context.$cloudcms = session;

    const branch = await build_branch(context);
    context.$branch = branch;
};