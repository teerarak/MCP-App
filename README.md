# MCP Stream HTTP Server

A Model Context Protocol (MCP) server that provides HTTP streaming capabilities. This server enables AI assistants to fetch and stream HTTP content, including support for Server-Sent Events (SSE).

## Features

- **HTTP Streaming**: Stream large HTTP responses in chunks
- **Complete HTTP Fetch**: Fetch entire HTTP responses with full metadata
- **Server-Sent Events (SSE)**: Parse and stream SSE events in real-time
- **Flexible HTTP Methods**: Support for GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS
- **Custom Headers**: Add custom headers to requests
- **Request Bodies**: Support for request bodies in POST/PUT/PATCH operations

## Installation

```bash
npm install
npm run build
```

## Available Tools

### 1. stream_http

Stream HTTP response content in chunks. Useful for large responses or real-time data streaming.

**Parameters:**
- `url` (required): The URL to fetch
- `method` (optional): HTTP method (GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS). Default: GET
- `headers` (optional): HTTP headers as key-value pairs
- `body` (optional): Request body for POST, PUT, PATCH
- `chunkSize` (optional): Size of each chunk in bytes. Default: 1024

**Response:**
```json
{
  "success": true,
  "url": "https://example.com",
  "method": "GET",
  "statusCode": 200,
  "statusText": "OK",
  "headers": {...},
  "chunksReceived": 5,
  "totalBytes": 5120,
  "content": "...",
  "chunks": [
    {
      "index": 0,
      "size": 1024,
      "timestamp": 1234567890
    }
  ]
}
```

### 2. fetch_http

Fetch complete HTTP response with full metadata.

**Parameters:**
- `url` (required): The URL to fetch
- `method` (optional): HTTP method. Default: GET
- `headers` (optional): HTTP headers as key-value pairs
- `body` (optional): Request body for POST, PUT, PATCH

**Response:**
```json
{
  "success": true,
  "url": "https://example.com",
  "method": "GET",
  "statusCode": 200,
  "statusText": "OK",
  "headers": {...},
  "contentLength": 5120,
  "content": "..."
}
```

### 3. stream_sse

Stream Server-Sent Events from a given URL. Parses and returns SSE events as they arrive.

**Parameters:**
- `url` (required): The SSE endpoint URL
- `headers` (optional): HTTP headers as key-value pairs
- `maxEvents` (optional): Maximum number of events to receive. Default: 100

**Response:**
```json
{
  "success": true,
  "url": "https://example.com/events",
  "eventsReceived": 10,
  "events": [
    {
      "id": "1",
      "event": "message",
      "data": "Event data",
      "timestamp": 1234567890
    }
  ]
}
```

## Configuration

### Using with Claude Desktop

Add this to your Claude Desktop configuration file:

**MacOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "stream-http": {
      "command": "node",
      "args": ["/path/to/MCP-App/dist/index.js"]
    }
  }
}
```

### Using with Other MCP Clients

The server uses stdio transport and can be integrated with any MCP-compatible client.

## Usage Examples

### Example 1: Fetch a Web Page

```javascript
// Using the fetch_http tool
{
  "url": "https://api.example.com/data",
  "method": "GET",
  "headers": {
    "User-Agent": "MCP-Client/1.0"
  }
}
```

### Example 2: Stream Large Response

```javascript
// Using the stream_http tool
{
  "url": "https://example.com/large-file",
  "method": "GET",
  "chunkSize": 2048
}
```

### Example 3: POST Request with Body

```javascript
// Using the fetch_http tool
{
  "url": "https://api.example.com/submit",
  "method": "POST",
  "headers": {
    "Content-Type": "application/json"
  },
  "body": "{\"key\": \"value\"}"
}
```

### Example 4: Stream Server-Sent Events

```javascript
// Using the stream_sse tool
{
  "url": "https://example.com/events",
  "maxEvents": 50
}
```

## Development

### Build

```bash
npm run build
```

### Watch Mode

```bash
npm run dev
```

### Run Server

```bash
npm start
```

## Error Handling

All tools return a consistent error format:

```json
{
  "success": false,
  "error": "Error message here",
  "url": "https://example.com"
}
```

## Technical Details

- **Protocol**: Model Context Protocol (MCP)
- **Transport**: stdio
- **Runtime**: Node.js
- **Language**: TypeScript
- **SDK Version**: @modelcontextprotocol/sdk ^1.0.4

## Architecture

The server implements three main tools:

1. **stream_http**: Uses Node.js streams to process HTTP responses chunk by chunk
2. **fetch_http**: Fetches complete responses using node-fetch
3. **stream_sse**: Parses Server-Sent Events protocol with proper event parsing

All tools include:
- Comprehensive error handling
- Detailed response metadata
- Timestamp tracking
- Flexible configuration options

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

For issues and questions, please open an issue on the GitHub repository.
