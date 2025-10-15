import axios, { AxiosInstance } from 'axios';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Parses inline formatting (bold, italic, strikethrough, code, links) in a text string
 * Returns an array of ADF text nodes with appropriate marks
 */
function parseInlineFormatting(text: string): any[] {
  const result: any[] = [];
  let currentPos = 0;

  // Combined regex that captures all inline formatting
  // Order matters: links, code, bold, italic, strikethrough
  const regex = /(\[([^\]]+)\]\(([^)]+)\)|`([^`]*)`|\*\*([^*]+)\*\*|__([^_]+)__|~~([^~]+)~~|\*([^*]+)\*|_([^_]+)_)/g;

  let match;
  while ((match = regex.exec(text)) !== null) {
    // Add any plain text before this match
    if (match.index > currentPos) {
      const plainText = text.substring(currentPos, match.index);
      if (plainText) {
        result.push({
          type: 'text',
          text: plainText,
        });
      }
    }

    // Determine what type of formatting was matched
    if (match[1] && match[2] && match[3]) {
      // Link: [text](url)
      result.push({
        type: 'text',
        text: match[2],
        marks: [
          {
            type: 'link',
            attrs: {
              href: match[3],
            },
          },
        ],
      });
    } else if (match[4] !== undefined) {
      // Inline code: `text`
      result.push({
        type: 'text',
        text: match[4],
        marks: [{ type: 'code' }],
      });
    } else if (match[5]) {
      // Bold: **text**
      result.push({
        type: 'text',
        text: match[5],
        marks: [{ type: 'strong' }],
      });
    } else if (match[6]) {
      // Bold: __text__
      result.push({
        type: 'text',
        text: match[6],
        marks: [{ type: 'strong' }],
      });
    } else if (match[7]) {
      // Strikethrough: ~~text~~
      result.push({
        type: 'text',
        text: match[7],
        marks: [{ type: 'strike' }],
      });
    } else if (match[8]) {
      // Italic: *text*
      result.push({
        type: 'text',
        text: match[8],
        marks: [{ type: 'em' }],
      });
    } else if (match[9]) {
      // Italic: _text_
      result.push({
        type: 'text',
        text: match[9],
        marks: [{ type: 'em' }],
      });
    }

    currentPos = match.index + match[0].length;
  }

  // Add any remaining plain text
  if (currentPos < text.length) {
    const plainText = text.substring(currentPos);
    if (plainText) {
      result.push({
        type: 'text',
        text: plainText,
      });
    }
  }

  // If no formatting was found, return the original text
  if (result.length === 0) {
    result.push({
      type: 'text',
      text: text,
    });
  }

  return result;
}

/**
 * Converts plain text to Atlassian Document Format (ADF)
 * Preserves line breaks, code blocks, and basic formatting including:
 * - Bold (**text** or __text__)
 * - Italic (*text* or _text_)
 * - Strikethrough (~~text~~)
 * - Inline code (`code`)
 * - Links ([text](url))
 * - Headings (# H1, ## H2, etc.)
 */
function textToADF(text: string): any {
  const lines = text.split('\n');
  const content: any[] = [];
  let inCodeBlock = false;
  let codeBlockLines: string[] = [];
  let codeLanguage = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Handle code blocks (```language or ```)
    if (line.trim().startsWith('```')) {
      if (!inCodeBlock) {
        // Starting a code block
        inCodeBlock = true;
        codeLanguage = line.trim().substring(3).trim();
        codeBlockLines = [];
      } else {
        // Ending a code block
        inCodeBlock = false;
        content.push({
          type: 'codeBlock',
          attrs: codeLanguage ? { language: codeLanguage } : {},
          content: [
            {
              type: 'text',
              text: codeBlockLines.join('\n'),
            },
          ],
        });
        codeBlockLines = [];
        codeLanguage = '';
      }
      continue;
    }

    // Collect lines inside code block
    if (inCodeBlock) {
      codeBlockLines.push(line);
      continue;
    }

    // Skip empty lines - JIRA will handle spacing between elements automatically
    if (line.trim() === '') {
      continue;
    }

    // Handle headings (# H1, ## H2, etc.)
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const headingText = headingMatch[2];
      content.push({
        type: 'heading',
        attrs: { level },
        content: parseInlineFormatting(headingText),
      });
      continue;
    }

    // Handle bullet lists (lines starting with -, *, or •)
    if (line.trim().match(/^[-*•]\s/)) {
      const listItem = line.trim().substring(2);
      // Check if we need to create a new list or add to existing
      if (content.length > 0 && content[content.length - 1].type === 'bulletList') {
        content[content.length - 1].content.push({
          type: 'listItem',
          content: [
            {
              type: 'paragraph',
              content: parseInlineFormatting(listItem),
            },
          ],
        });
      } else {
        content.push({
          type: 'bulletList',
          content: [
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: parseInlineFormatting(listItem),
                },
              ],
            },
          ],
        });
      }
      continue;
    }

    // Handle numbered lists (lines starting with 1., 2., etc.)
    if (line.trim().match(/^\d+\.\s/)) {
      const listItem = line.trim().replace(/^\d+\.\s/, '');
      // Check if we need to create a new list or add to existing
      if (content.length > 0 && content[content.length - 1].type === 'orderedList') {
        content[content.length - 1].content.push({
          type: 'listItem',
          content: [
            {
              type: 'paragraph',
              content: parseInlineFormatting(listItem),
            },
          ],
        });
      } else {
        content.push({
          type: 'orderedList',
          content: [
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: parseInlineFormatting(listItem),
                },
              ],
            },
          ],
        });
      }
      continue;
    }

    // Handle regular paragraphs with inline formatting
    content.push({
      type: 'paragraph',
      content: parseInlineFormatting(line),
    });
  }

  // Handle unclosed code block
  if (inCodeBlock && codeBlockLines.length > 0) {
    content.push({
      type: 'codeBlock',
      attrs: codeLanguage ? { language: codeLanguage } : {},
      content: [
        {
          type: 'text',
          text: codeBlockLines.join('\n'),
        },
      ],
    });
  }

  return {
    type: 'doc',
    version: 1,
    content: content.length > 0 ? content : [{ type: 'paragraph', content: [] }],
  };
}

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

  async getIssue(issueKey: string, fields?: string[]): Promise<JiraIssue> {
    const params = fields && fields.length > 0 ? { fields: fields.join(',') } : {};
    const response = await this.client.get(`/issue/${issueKey}`, { params });
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
        description: params.description ? textToADF(params.description) : undefined,
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
      fields.description = textToADF(params.description);
    }

    await this.client.put(`/issue/${issueKey}`, { fields });
    return { success: true, message: `Issue ${issueKey} updated successfully` };
  }

  async addComment(issueKey: string, comment: string): Promise<any> {
    const response = await this.client.post(`/issue/${issueKey}/comment`, {
      body: textToADF(comment),
    });
    return response.data;
  }

  async deleteComment(issueKey: string, commentId: string): Promise<any> {
    await this.client.delete(`/issue/${issueKey}/comment/${commentId}`);
    return { success: true, message: `Comment ${commentId} deleted successfully from issue ${issueKey}` };
  }

  async getAttachments(issueKey: string): Promise<JiraAttachment[]> {
    const issue = await this.getIssue(issueKey, ['attachment']);
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
