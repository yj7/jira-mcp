# Jira MCP Server

A Model Context Protocol (MCP) server for Jira integration with comprehensive attachment support.

## Features

- **Issue Management**: Get, create, update, and search Jira issues with field filtering support
- **Comments**: Add and delete comments on issues with automatic formatting
- **Text Formatting**: Automatic conversion of markdown-like text to Atlassian Document Format (ADF)
  - Code blocks, inline code, bullet lists, numbered lists, line breaks
- **Attachments**:
  - Get all attachments for an issue with metadata
  - Download specific attachments to disk

## Installation

```bash
npm install
npm run build
```

## Configuration

Create a `.env` file in the root directory with your Jira credentials:

```env
JIRA_URL=https://your-domain.atlassian.net
JIRA_EMAIL=your-email@example.com
JIRA_API_TOKEN=your-api-token
```

### Getting a Jira API Token

1. Go to https://id.atlassian.com/manage-profile/security/api-tokens
2. Click "Create API token"
3. Give it a label and copy the generated token
4. Use this token in your `.env` file

## Usage with Claude Desktop

Add this server to your Claude Desktop configuration:

### macOS

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "jira": {
      "command": "node",
      "args": ["/absolute/path/to/jira-mcp/build/index.js"],
      "env": {
        "JIRA_URL": "https://your-domain.atlassian.net",
        "JIRA_EMAIL": "your-email@example.com",
        "JIRA_API_TOKEN": "your-api-token"
      }
    }
  }
}
```

### Windows

Edit `%APPDATA%\Claude\claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "jira": {
      "command": "node",
      "args": ["C:\\path\\to\\jira-mcp\\build\\index.js"],
      "env": {
        "JIRA_URL": "https://your-domain.atlassian.net",
        "JIRA_EMAIL": "your-email@example.com",
        "JIRA_API_TOKEN": "your-api-token"
      }
    }
  }
}
```

## Available Tools

### get_issue
Get details of a Jira issue by key. Supports field filtering to reduce response size and avoid token limits.

**Parameters:**
- `issueKey` (string, required): The Jira issue key (e.g., "PROJ-123")
- `fields` (array of strings, optional): Specific fields to retrieve (e.g., `["summary", "status", "description"]`). If not provided, returns all fields.

**Example:**
```
Get details for issue PROJ-123
Get only the summary and status of issue PROJ-123
```

**Common fields:**
- `summary`: Issue title
- `status`: Current status
- `description`: Issue description
- `assignee`: Assigned user
- `reporter`: Reporter user
- `priority`: Priority level
- `created`: Creation date
- `updated`: Last update date
- `comment`: Comments
- `attachment`: Attachments

**Note:** Use the `fields` parameter to limit the response size when dealing with issues that have many comments, attachments, or custom fields. This helps avoid the MCP 25,000 token limit.

### search_issues
Search for Jira issues using JQL (Jira Query Language).

**Parameters:**
- `jql` (string, required): JQL query string
- `maxResults` (number, optional): Maximum number of results (default: 50)

**Example:**
```
Search for all open bugs in project PROJ
```

### create_issue
Create a new Jira issue with automatic formatting support.

**Parameters:**
- `project` (string, required): Project key
- `summary` (string, required): Issue title
- `description` (string, optional): Issue description (supports formatting - see below)
- `issueType` (string, required): Issue type (Task, Bug, Story, etc.)

**Example:**
```
Create a new bug in project PROJ with title "Login button not working"
```

**Formatting Support:**
The description field supports markdown-like formatting that is automatically converted to Atlassian Document Format (ADF):
- **Line breaks**: Preserved automatically
- **Code blocks**: Use triple backticks with optional language
  ```
  ```javascript
  function example() {
    return true;
  }
  ```
  ```
- **Inline code**: Use single backticks `like this`
- **Bullet lists**: Start lines with `-`, `*`, or `•`
- **Numbered lists**: Start lines with `1.`, `2.`, etc.

### update_issue
Update an existing Jira issue with automatic formatting support.

**Parameters:**
- `issueKey` (string, required): The Jira issue key
- `summary` (string, optional): New issue title
- `description` (string, optional): New issue description (supports formatting - see create_issue)

**Example:**
```
Update issue PROJ-123 with a new description
```

### add_comment
Add a comment to a Jira issue with automatic formatting support.

**Parameters:**
- `issueKey` (string, required): The Jira issue key
- `comment` (string, required): Comment text (supports formatting - see create_issue)

**Example:**
```
Add a comment to issue PROJ-123 saying "This has been fixed"
```

### delete_comment
Delete a comment from a Jira issue.

**Parameters:**
- `issueKey` (string, required): The Jira issue key
- `commentId` (string, required): The comment ID to delete

**Example:**
```
Delete comment 10001 from issue PROJ-123
```

**How to get comment IDs:**
You can get comment IDs by fetching the issue with the `comment` field:
```
get_issue({
  issueKey: "PROJ-123",
  fields: ["comment"]
})
```

Each comment in the response will have an `id` field that you can use for deletion.

### get_attachments
Get all attachments for a Jira issue, including metadata and download URLs.

**Parameters:**
- `issueKey` (string, required): The Jira issue key

**Returns:**
- Array of attachments with metadata:
  - `id`: Attachment ID
  - `filename`: Original filename
  - `author`: Author information
  - `created`: Creation timestamp
  - `size`: File size in bytes
  - `mimeType`: MIME type
  - `content`: Download URL

**Example:**
```
Get all attachments for issue PROJ-123
```

### download_attachment
Download a specific attachment and save it to disk. This avoids token limits for large files.

**Parameters:**
- `attachmentId` (string, required): The attachment ID (from get_attachments)
- `outputDir` (string, optional): Directory to save the file (defaults to current directory)

**Returns:**
- `id`: Attachment ID
- `filename`: Original filename
- `mimeType`: MIME type
- `size`: File size in bytes
- `savedPath`: Full path where the file was saved

**Example:**
```
Download attachment with ID 12345 to ./downloads
```

**Note:** Large attachments are saved directly to disk to avoid MCP token limits (25,000 tokens). The file is saved with a sanitized filename in the specified directory.

## Development

### Build
```bash
npm run build
```

### Watch mode
```bash
npm run watch
```

## Troubleshooting

### Authentication Issues
- Verify your Jira URL is correct (should include the full domain)
- Ensure your API token is valid and not expired
- Check that your email matches your Atlassian account

### Connection Issues
- Make sure your Jira instance is accessible
- Check if you're behind a proxy or firewall
- Verify the Jira REST API v3 is available on your instance

### Attachment Issues
- Ensure you have permission to view attachments on the issue
- Large attachments may take time to download and are saved directly to disk
- Make sure you have write permissions in the output directory
- Check available disk space for large attachments

## API Reference

This server uses the Jira REST API v3. For more information:
- [Jira REST API Documentation](https://developer.atlassian.com/cloud/jira/platform/rest/v3/)
- [Model Context Protocol Documentation](https://modelcontextprotocol.io/)

## License

MIT
