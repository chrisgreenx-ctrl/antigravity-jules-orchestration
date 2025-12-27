import express from 'express';
import dotenv from 'dotenv';
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ToolDefinitions } from './tools/definitions.js';
import { handlers } from './tools/handlers.js';
import { LRUCache, SessionQueue } from './lib/infrastructure.js';

dotenv.config();

const VERSION = '2.6.1';
const PORT = process.env.PORT || 3324;

// Export config schema for Smithery to validate env vars
export const configSchema = z.object({
  JULES_API_KEY: z.string().optional().describe("Jules API Key"),
  GITHUB_TOKEN: z.string().optional().describe("GitHub Personal Access Token"),
  PORT: z.any().optional(),
  LOG_LEVEL: z.string().optional(),
  DATABASE_URL: z.string().optional(),
  SEMANTIC_MEMORY_URL: z.string().optional(),
  ALLOWED_ORIGINS: z.string().optional(),
});

/**
 * Required: Export default createServer function for Smithery
 */
export default function createServer({ config }: { config: any }) {
  // Apply config to process.env so existing modules work
  if (config) {
    if (config.JULES_API_KEY) process.env.JULES_API_KEY = config.JULES_API_KEY;
    if (config.GITHUB_TOKEN) process.env.GITHUB_TOKEN = config.GITHUB_TOKEN;
    if (config.LOG_LEVEL) process.env.LOG_LEVEL = config.LOG_LEVEL;
  }

  // Create the MCP Server instance required by Smithery
  const server = new McpServer({
    name: "antigravity-jules-orchestration",
    version: VERSION
  });

  // Register all tools using the modularized definitions and handlers
  for (const [name, def] of Object.entries(ToolDefinitions)) {
    const handler = (handlers as any)[name];
    if (handler) {
      server.tool(
        name,
        def.description,
        (def.schema as any).shape,
        async (args) => {
          try {
            const result = await handler(args);
            return {
              content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }]
            };
          } catch (error: any) {
            return {
              content: [{ type: "text" as const, text: `Error: ${error.message}` }],
              isError: true
            };
          }
        }
      );
    }
  }

  return server.server;
}

// ============ EXPRESS COMPATIBILITY LAYER ============
// This allows the server to still run as a standalone Express app if needed

const app = express();
app.use(express.json());

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, X-API-Key, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// .well-known/mcp-config
app.get('/.well-known/mcp-config', (req, res) => {
  res.json({ sse: { endpoint: 'mcp/messages' } });
});

// Health check
app.get(['/health', '/api/v1/health'], (req, res) => {
  res.json({ status: 'ok', version: VERSION, timestamp: new Date().toISOString() });
});

// Start Express if running directly
// if (import.meta.url === `file://${process.argv[1]}`) {
//   app.listen(PORT, () => {
//     console.log(`Express server running on port ${PORT}`);
//   });
// }
