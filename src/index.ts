#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import fetch, { Response } from "node-fetch";
import { Readable } from "stream";

/**
 * MCP Server for HTTP Streaming
 * Provides tools to fetch and stream HTTP content
 */

interface StreamChunk {
  data: string;
  timestamp: number;
  index: number;
}

interface StreamHttpArgs {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  chunkSize?: number;
}

interface FetchHttpArgs {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}

// Define available tools
const TOOLS: Tool[] = [
  {
    name: "stream_http",
    description:
      "Stream HTTP response content in chunks. Useful for large responses or real-time data streaming. Returns content progressively as it's received.",
    inputSchema: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "The URL to fetch",
        },
        method: {
          type: "string",
          description: "HTTP method (GET, POST, PUT, DELETE, etc.)",
          enum: ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"],
          default: "GET",
        },
        headers: {
          type: "object",
          description: "HTTP headers as key-value pairs",
          additionalProperties: {
            type: "string",
          },
        },
        body: {
          type: "string",
          description: "Request body (for POST, PUT, PATCH)",
        },
        chunkSize: {
          type: "number",
          description: "Size of each chunk in bytes (default: 1024)",
          default: 1024,
        },
      },
      required: ["url"],
    },
  },
  {
    name: "fetch_http",
    description:
      "Fetch complete HTTP response. Returns the full response body, headers, and status code.",
    inputSchema: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "The URL to fetch",
        },
        method: {
          type: "string",
          description: "HTTP method (GET, POST, PUT, DELETE, etc.)",
          enum: ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"],
          default: "GET",
        },
        headers: {
          type: "object",
          description: "HTTP headers as key-value pairs",
          additionalProperties: {
            type: "string",
          },
        },
        body: {
          type: "string",
          description: "Request body (for POST, PUT, PATCH)",
        },
      },
      required: ["url"],
    },
  },
  {
    name: "stream_sse",
    description:
      "Stream Server-Sent Events (SSE) from a given URL. Parses and returns SSE events as they arrive.",
    inputSchema: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "The SSE endpoint URL",
        },
        headers: {
          type: "object",
          description: "HTTP headers as key-value pairs",
          additionalProperties: {
            type: "string",
          },
        },
        maxEvents: {
          type: "number",
          description: "Maximum number of events to receive (default: 100)",
          default: 100,
        },
      },
      required: ["url"],
    },
  },
];

/**
 * Stream HTTP response content in chunks
 */
async function streamHttp(args: StreamHttpArgs): Promise<string> {
  const { url, method = "GET", headers = {}, body, chunkSize = 1024 } = args;

  try {
    const response = await fetch(url, {
      method,
      headers: {
        ...headers,
      },
      body: body ? body : undefined,
    });

    if (!response.ok) {
      throw new Error(
        `HTTP error! status: ${response.status} ${response.statusText}`
      );
    }

    if (!response.body) {
      throw new Error("No response body available for streaming");
    }

    const chunks: StreamChunk[] = [];
    let index = 0;

    // Convert node-fetch body to Node.js stream
    const stream = Readable.from(response.body);

    // Read stream chunks
    for await (const chunk of stream) {
      const data = chunk.toString();
      chunks.push({
        data,
        timestamp: Date.now(),
        index: index++,
      });
    }

    const fullContent = chunks.map((c) => c.data).join("");

    return JSON.stringify(
      {
        success: true,
        url,
        method,
        statusCode: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        chunksReceived: chunks.length,
        totalBytes: fullContent.length,
        content: fullContent,
        chunks: chunks.map((c) => ({
          index: c.index,
          size: c.data.length,
          timestamp: c.timestamp,
        })),
      },
      null,
      2
    );
  } catch (error) {
    return JSON.stringify(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        url,
      },
      null,
      2
    );
  }
}

/**
 * Fetch complete HTTP response
 */
async function fetchHttp(args: FetchHttpArgs): Promise<string> {
  const { url, method = "GET", headers = {}, body } = args;

  try {
    const response = await fetch(url, {
      method,
      headers: {
        ...headers,
      },
      body: body ? body : undefined,
    });

    const content = await response.text();

    return JSON.stringify(
      {
        success: true,
        url,
        method,
        statusCode: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        contentLength: content.length,
        content: content,
      },
      null,
      2
    );
  } catch (error) {
    return JSON.stringify(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        url,
      },
      null,
      2
    );
  }
}

/**
 * Stream Server-Sent Events
 */
async function streamSSE(args: {
  url: string;
  headers?: Record<string, string>;
  maxEvents?: number;
}): Promise<string> {
  const { url, headers = {}, maxEvents = 100 } = args;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "text/event-stream",
        ...headers,
      },
    });

    if (!response.ok) {
      throw new Error(
        `HTTP error! status: ${response.status} ${response.statusText}`
      );
    }

    if (!response.body) {
      throw new Error("No response body available for SSE streaming");
    }

    const events: Array<{
      id?: string;
      event?: string;
      data: string;
      timestamp: number;
    }> = [];
    let buffer = "";
    let eventCount = 0;

    // Convert node-fetch body to Node.js stream
    const stream = Readable.from(response.body);

    // Read stream chunks
    for await (const chunk of stream) {
      if (eventCount >= maxEvents) {
        break;
      }

      buffer += chunk.toString();
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      let currentEvent: {
        id?: string;
        event?: string;
        data: string[];
      } = { data: [] };

      for (const line of lines) {
        if (line.trim() === "") {
          // Empty line indicates end of event
          if (currentEvent.data.length > 0) {
            events.push({
              id: currentEvent.id,
              event: currentEvent.event,
              data: currentEvent.data.join("\n"),
              timestamp: Date.now(),
            });
            eventCount++;
            currentEvent = { data: [] };

            if (eventCount >= maxEvents) {
              break;
            }
          }
        } else if (line.startsWith(":")) {
          // Comment, ignore
          continue;
        } else {
          const colonIndex = line.indexOf(":");
          if (colonIndex !== -1) {
            const field = line.slice(0, colonIndex);
            const value = line.slice(colonIndex + 1).trimStart();

            if (field === "id") {
              currentEvent.id = value;
            } else if (field === "event") {
              currentEvent.event = value;
            } else if (field === "data") {
              currentEvent.data.push(value);
            }
          }
        }
      }
    }

    return JSON.stringify(
      {
        success: true,
        url,
        eventsReceived: events.length,
        events,
      },
      null,
      2
    );
  } catch (error) {
    return JSON.stringify(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        url,
      },
      null,
      2
    );
  }
}

/**
 * Main server implementation
 */
async function main() {
  const server = new Server(
    {
      name: "mcp-stream-http",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // List available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: TOOLS,
    };
  });

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      if (!args) {
        throw new Error("No arguments provided");
      }

      switch (name) {
        case "stream_http": {
          const result = await streamHttp(args as unknown as StreamHttpArgs);
          return {
            content: [
              {
                type: "text",
                text: result,
              },
            ],
          };
        }

        case "fetch_http": {
          const result = await fetchHttp(args as unknown as FetchHttpArgs);
          return {
            content: [
              {
                type: "text",
                text: result,
              },
            ],
          };
        }

        case "stream_sse": {
          const result = await streamSSE(
            args as unknown as {
              url: string;
              headers?: Record<string, string>;
              maxEvents?: number;
            }
          );
          return {
            content: [
              {
                type: "text",
                text: result,
              },
            ],
          };
        }

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: false,
                error: errorMessage,
              },
              null,
              2
            ),
          },
        ],
        isError: true,
      };
    }
  });

  // Start the server
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error("MCP Stream HTTP server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
