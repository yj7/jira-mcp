import axios, { AxiosInstance } from 'axios';
import * as fs from 'fs';
import * as path from 'path';

export interface JiraIssue {
  key: string;
  fields: {
    summary: string;
    description?: string;
    status: {
      name: string;
    };
    issuetype: {
      name: string;
    };
    [key: string]: any;
  };
}

export interface JiraAttachment {
  id: string;
  filename: string;
  author: {
    displayName: string;
    emailAddress?: string;
  };
  created: string;
  size: number;
  mimeType: string;
  content: string; // URL to download the attachment
}

export interface AttachmentDownload {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  savedPath: string; // Path where the file was saved
}

export class JiraClient {
  private client: AxiosInstance;

  constructor(
    private jiraUrl: string,
    private email: string,
    private apiToken: string
  ) {
    this.client = axios.create({
      baseURL: `${jiraUrl}/rest/api/3`,
      auth: {
        username: email,
        password: apiToken,
      },
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });
  }

  async getIssue(issueKey: string): Promise<JiraIssue> {
    const response = await this.client.get(`/issue/${issueKey}`);
    return response.data;
  }

  async searchIssues(jql: string, maxResults: number = 50): Promise<any> {
    const response = await this.client.post('/search', {
      jql,
      maxResults,
      fields: ['summary', 'status', 'assignee', 'reporter', 'created', 'updated'],
    });
    return response.data;
  }

  async createIssue(params: {
    project: string;
    summary: string;
    description?: string;
    issueType: string;
  }): Promise<any> {
    const response = await this.client.post('/issue', {
      fields: {
        project: {
          key: params.project,
        },
        summary: params.summary,
        description: params.description
          ? {
              type: 'doc',
              version: 1,
              content: [
                {
                  type: 'paragraph',
                  content: [
                    {
                      type: 'text',
                      text: params.description,
                    },
                  ],
                },
              ],
            }
          : undefined,
        issuetype: {
          name: params.issueType,
        },
      },
    });
    return response.data;
  }

  async updateIssue(
    issueKey: string,
    params: {
      summary?: string;
      description?: string;
    }
  ): Promise<any> {
    const fields: any = {};

    if (params.summary) {
      fields.summary = params.summary;
    }

    if (params.description) {
      fields.description = {
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: params.description,
              },
            ],
          },
        ],
      };
    }

    await this.client.put(`/issue/${issueKey}`, { fields });
    return { success: true, message: `Issue ${issueKey} updated successfully` };
  }

  async addComment(issueKey: string, comment: string): Promise<any> {
    const response = await this.client.post(`/issue/${issueKey}/comment`, {
      body: {
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: comment,
              },
            ],
          },
        ],
      },
    });
    return response.data;
  }

  async getAttachments(issueKey: string): Promise<JiraAttachment[]> {
    const issue = await this.getIssue(issueKey);
    const attachments = issue.fields.attachment || [];

    return attachments.map((attachment: any) => ({
      id: attachment.id,
      filename: attachment.filename,
      author: {
        displayName: attachment.author.displayName,
        emailAddress: attachment.author.emailAddress,
      },
      created: attachment.created,
      size: attachment.size,
      mimeType: attachment.mimeType,
      content: attachment.content,
    }));
  }

  async downloadAttachment(attachmentId: string, outputDir?: string): Promise<AttachmentDownload> {
    // First, get attachment metadata
    const metadataResponse = await this.client.get(`/attachment/${attachmentId}`);
    const metadata = metadataResponse.data;

    // Download the attachment content
    const contentResponse = await this.client.get(metadata.content, {
      responseType: 'arraybuffer',
      // Use the full URL from metadata.content which is absolute
      baseURL: undefined,
    });

    // Determine output directory
    const saveDir = outputDir || process.cwd();

    // Ensure directory exists
    if (!fs.existsSync(saveDir)) {
      fs.mkdirSync(saveDir, { recursive: true });
    }

    // Generate safe filename
    const filename = metadata.filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const fullPath = path.join(saveDir, filename);

    // Save file to disk
    fs.writeFileSync(fullPath, Buffer.from(contentResponse.data));

    return {
      id: metadata.id,
      filename: metadata.filename,
      mimeType: metadata.mimeType,
      size: metadata.size,
      savedPath: fullPath,
    };
  }
}
