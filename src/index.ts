#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { JiraClient } from './jira-client.js';
import dotenv from 'dotenv';

dotenv.config();

const JIRA_URL = process.env.JIRA_URL;
const JIRA_EMAIL = process.env.JIRA_EMAIL;
const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN;

if (!JIRA_URL || !JIRA_EMAIL || !JIRA_API_TOKEN) {
  console.error('Error: Missing required environment variables');
  console.error('Please set JIRA_URL, JIRA_EMAIL, and JIRA_API_TOKEN');
  process.exit(1);
}

const jiraClient = new JiraClient(JIRA_URL, JIRA_EMAIL, JIRA_API_TOKEN);

const server = new Server(
  {
    name: 'jira-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

const tools: Tool[] = [
  {
    name: 'get_issue',
    description: 'Get details of a Jira issue by key (e.g., PROJ-123). Use the fields parameter to limit response size.',
    inputSchema: {
      type: 'object',
      properties: {
        issueKey: {
          type: 'string',
          description: 'The Jira issue key (e.g., PROJ-123)',
        },
        fields: {
          type: 'array',
          items: {
            type: 'string',
          },
          description: 'Optional array of field names to retrieve (e.g., ["summary", "status", "description"]). If not provided, returns all fields.',
        },
      },
      required: ['issueKey'],
    },
  },
  {
    name: 'search_issues',
    description: 'Search for Jira issues using JQL (Jira Query Language)',
    inputSchema: {
      type: 'object',
      properties: {
        jql: {
          type: 'string',
          description: 'JQL query string (e.g., "project = PROJ AND status = Open")',
        },
        maxResults: {
          type: 'number',
          description: 'Maximum number of results to return (default: 50)',
        },
      },
      required: ['jql'],
    },
  },
  {
    name: 'create_issue',
    description: 'Create a new Jira issue',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description: 'Project key (e.g., PROJ)',
        },
        summary: {
          type: 'string',
          description: 'Issue summary/title',
        },
        description: {
          type: 'string',
          description: 'Issue description',
        },
        issueType: {
          type: 'string',
          description: 'Issue type (e.g., Task, Bug, Story)',
        },
      },
      required: ['project', 'summary', 'issueType'],
    },
  },
  {
    name: 'update_issue',
    description: 'Update an existing Jira issue',
    inputSchema: {
      type: 'object',
      properties: {
        issueKey: {
          type: 'string',
          description: 'The Jira issue key (e.g., PROJ-123)',
        },
        summary: {
          type: 'string',
          description: 'New issue summary/title',
        },
        description: {
          type: 'string',
          description: 'New issue description',
        },
      },
      required: ['issueKey'],
    },
  },
  {
    name: 'add_comment',
    description: 'Add a comment to a Jira issue with optional file attachments',
    inputSchema: {
      type: 'object',
      properties: {
        issueKey: {
          type: 'string',
          description: 'The Jira issue key (e.g., PROJ-123)',
        },
        comment: {
          type: 'string',
          description: 'Comment text',
        },
        attachments: {
          type: 'array',
          items: {
            type: 'string',
          },
          description: 'Optional array of absolute file paths to attach to the comment',
        },
      },
      required: ['issueKey', 'comment'],
    },
  },
  {
    name: 'delete_comment',
    description: 'Delete a comment from a Jira issue',
    inputSchema: {
      type: 'object',
      properties: {
        issueKey: {
          type: 'string',
          description: 'The Jira issue key (e.g., PROJ-123)',
        },
        commentId: {
          type: 'string',
          description: 'The comment ID to delete',
        },
      },
      required: ['issueKey', 'commentId'],
    },
  },
  {
    name: 'get_attachments',
    description: 'Get all attachments for a Jira issue, including metadata and download URLs',
    inputSchema: {
      type: 'object',
      properties: {
        issueKey: {
          type: 'string',
          description: 'The Jira issue key (e.g., PROJ-123)',
        },
      },
      required: ['issueKey'],
    },
  },
  {
    name: 'download_attachment',
    description: 'Download a specific attachment from a Jira issue and save it to disk',
    inputSchema: {
      type: 'object',
      properties: {
        attachmentId: {
          type: 'string',
          description: 'The attachment ID',
        },
        outputDir: {
          type: 'string',
          description: 'Directory to save the file (optional, defaults to current directory)',
        },
      },
      required: ['attachmentId'],
    },
  },
  {
    name: 'add_attachment',
    description: 'Upload and attach a file to a Jira issue',
    inputSchema: {
      type: 'object',
      properties: {
        issueKey: {
          type: 'string',
          description: 'The Jira issue key (e.g., PROJ-123)',
        },
        filePath: {
          type: 'string',
          description: 'Absolute path to the file to attach',
        },
      },
      required: ['issueKey', 'filePath'],
    },
  },
];

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (!args) {
    return {
      content: [
        {
          type: 'text',
          text: 'Error: Missing arguments',
        },
      ],
      isError: true,
    };
  }

  try {
    switch (name) {
      case 'get_issue': {
        const result = await jiraClient.getIssue(
          args.issueKey as string,
          args.fields as string[] | undefined
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'search_issues': {
        const result = await jiraClient.searchIssues(
          args.jql as string,
          args.maxResults as number | undefined
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'create_issue': {
        const result = await jiraClient.createIssue({
          project: args.project as string,
          summary: args.summary as string,
          description: args.description as string,
          issueType: args.issueType as string,
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'update_issue': {
        const result = await jiraClient.updateIssue(
          args.issueKey as string,
          {
            summary: args.summary as string | undefined,
            description: args.description as string | undefined,
          }
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'add_comment': {
        const result = await jiraClient.addComment(
          args.issueKey as string,
          args.comment as string,
          args.attachments as string[] | undefined
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'delete_comment': {
        const result = await jiraClient.deleteComment(
          args.issueKey as string,
          args.commentId as string
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'get_attachments': {
        const result = await jiraClient.getAttachments(args.issueKey as string);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'download_attachment': {
        const result = await jiraClient.downloadAttachment(
          args.attachmentId as string,
          args.outputDir as string | undefined
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'add_attachment': {
        const result = await jiraClient.uploadAttachment(
          args.issueKey as string,
          args.filePath as string
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      default:
        return {
          content: [
            {
              type: 'text',
              text: `Unknown tool: ${name}`,
            },
          ],
          isError: true,
        };
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Jira MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
