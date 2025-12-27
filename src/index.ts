import { createStatelessServer } from '@smithery/sdk';
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import dotenv from 'dotenv';

dotenv.config();

const VERSION = '2.6.1';

// Export config schema for Smithery to validate env vars
export const configSchema = z.object({
  JULES_API_KEY: z.string().optional().describe("Jules API Key"),
  GITHUB_TOKEN: z.string().optional().describe("GitHub Personal Access Token"),
  PORT: z.any().optional(),
  LOG_LEVEL: z.string().optional(),
});

/**
 * Create MCP server function for Smithery SDK
 */
function createMcpServer({ config }: { config: any }) {
  // Apply config to process.env so existing modules work
  if (config) {
    if (config.JULES_API_KEY) process.env.JULES_API_KEY = config.JULES_API_KEY;
    if (config.GITHUB_TOKEN) process.env.GITHUB_TOKEN = config.GITHUB_TOKEN;
    if (config.LOG_LEVEL) process.env.LOG_LEVEL = config.LOG_LEVEL;
  }

  // Create the MCP Server instance
  const server = new McpServer({
    name: "antigravity-jules-orchestration",
    version: VERSION
  });

  // Register a simple health check tool
  server.tool(
    "health_check",
    "Check server health and configuration status",
    {},
    async () => ({
      content: [{
        type: "text" as const,
        text: JSON.stringify({
          status: "ok",
          version: VERSION,
          timestamp: new Date().toISOString(),
          configured: !!process.env.JULES_API_KEY
        }, null, 2)
      }]
    })
  );

  // Register jules_list_sources
  server.tool(
    "jules_list_sources",
    "List all connected GitHub repositories (sources)",
    {},
    async () => {
      try {
        const https = await import('https');
        return new Promise((resolve) => {
          const req = https.request({
            hostname: 'jules.googleapis.com',
            port: 443,
            path: '/v1alpha/sources',
            method: 'GET',
            headers: {
              'X-Goog-Api-Key': process.env.JULES_API_KEY || '',
              'Content-Type': 'application/json'
            }
          }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
              resolve({
                content: [{ type: "text" as const, text: data }]
              });
            });
          });
          req.on('error', (err) => {
            resolve({
              content: [{ type: "text" as const, text: `Error: ${err.message}` }],
              isError: true
            });
          });
          req.end();
        });
      } catch (error: any) {
        return {
          content: [{ type: "text" as const, text: `Error: ${error.message}` }],
          isError: true
        };
      }
    }
  );

  // Register jules_list_sessions
  server.tool(
    "jules_list_sessions",
    "List all Jules sessions",
    {},
    async () => {
      try {
        const https = await import('https');
        return new Promise((resolve) => {
          const req = https.request({
            hostname: 'jules.googleapis.com',
            port: 443,
            path: '/v1alpha/sessions',
            method: 'GET',
            headers: {
              'X-Goog-Api-Key': process.env.JULES_API_KEY || '',
              'Content-Type': 'application/json'
            }
          }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
              resolve({
                content: [{ type: "text" as const, text: data }]
              });
            });
          });
          req.on('error', (err) => {
            resolve({
              content: [{ type: "text" as const, text: `Error: ${err.message}` }],
              isError: true
            });
          });
          req.end();
        });
      } catch (error: any) {
        return {
          content: [{ type: "text" as const, text: `Error: ${error.message}` }],
          isError: true
        };
      }
    }
  );

  return server.server;
}

// Use Smithery SDK to create the HTTP server (bypasses @smithery/cli)
const statelessServer = createStatelessServer(createMcpServer);
statelessServer.app.listen(process.env.PORT || 8081, () => {
  console.log(`> Server starting on port ${process.env.PORT || 8081}`);
  console.log(`> MCP endpoint available at /mcp`);
});

// Also export createServer for compatibility
export default createMcpServer;
