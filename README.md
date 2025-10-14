# Jira MCP Server

A Model Context Protocol (MCP) server for Jira integration with comprehensive attachment support.

## Features

- **Issue Management**: Get, create, update, and search Jira issues
- **Comments**: Add comments to issues
- **Attachments**:
  - Get all attachments for an issue with metadata
  - Download specific attachments with base64-encoded content

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
Get details of a Jira issue by key.

**Parameters:**
- `issueKey` (string, required): The Jira issue key (e.g., "PROJ-123")

**Example:**
```
Get details for issue PROJ-123
```

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
Create a new Jira issue.

**Parameters:**
- `project` (string, required): Project key
- `summary` (string, required): Issue title
- `description` (string, optional): Issue description
- `issueType` (string, required): Issue type (Task, Bug, Story, etc.)

**Example:**
```
Create a new bug in project PROJ with title "Login button not working"
```

### update_issue
Update an existing Jira issue.

**Parameters:**
- `issueKey` (string, required): The Jira issue key
- `summary` (string, optional): New issue title
- `description` (string, optional): New issue description

**Example:**
```
Update issue PROJ-123 with a new description
```

### add_comment
Add a comment to a Jira issue.

**Parameters:**
- `issueKey` (string, required): The Jira issue key
- `comment` (string, required): Comment text

**Example:**
```
Add a comment to issue PROJ-123 saying "This has been fixed"
```

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
