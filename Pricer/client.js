import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
let client = undefined
const url = "http://127.0.0.1:4000/mcp"
const baseUrl = new URL(url);
try {
    client = new Client({
        name: 'streamable-http-client',
        version: '1.0.0'
    });
    const transport = new StreamableHTTPClientTransport(
        new URL(baseUrl)
    );
    await client.connect(transport);
    let results = await client.listTools()
    let addResult = await client.callTool({ name: "add", arguments: { a: 5, b: 10 } })

    console.log("Connected using Streamable HTTP transport");
    // console.log(results, "RESULTS")
    console.log(addResult, "ADD")
} catch (error) {
    // If that fails with a 4xx error, try the older SSE transport
    console.log("Streamable HTTP connection failed, falling back to SSE transport");
    client = new Client({
        name: 'sse-client',
        version: '1.0.0'
    });
    const sseTransport = new SSEClientTransport(baseUrl);
    await client.connect(sseTransport);
    console.log("Connected using SSE transport");
}