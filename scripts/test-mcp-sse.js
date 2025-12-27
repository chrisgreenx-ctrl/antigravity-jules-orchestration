
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

// Basic polyfill if needed, though Node 18+ has fetch
if (!global.fetch) {
    console.log("Polyfilling fetch...");
    global.fetch = fetch;
}

async function testMCPSSE() {
    const url = new URL("http://localhost:3323/mcp");
    console.log(`Connecting to MCP SSE server at ${url.href}...`);

    const transport = new SSEClientTransport(url);
    const client = new Client(
        {
            name: "test-client",
            version: "1.0.0",
        },
        {
            capabilities: {},
        }
    );

    try {
        transport.onerror = (err) => {
            console.error("Transport Error Details:", JSON.stringify(err, null, 2));
        };

        await client.connect(transport);
        console.log("Connected successfully!");

        console.log("Listing tools...");
        const tools = await client.listTools();
        console.log("Available tools:", tools.tools.map(t => t.name).join(", "));

        // Test a simple tool call if available
        if (tools.tools.includes('jules_list_sessions')) {
            console.log("Testing jules_list_sessions...");
            const sessions = await client.callTool({ name: 'jules_list_sessions', arguments: {} });
            console.log("Session list result:", sessions);
            console.log("SUCCESS: Tool execution verified.");
        }

        process.exit(0);
    } catch (error) {
        console.error("Test execution failed:", error);
        if (error.event) {
            console.error("Error Event:", JSON.stringify(error.event, null, 2));
        }
        process.exit(1);
    }
}

testMCPSSE();
