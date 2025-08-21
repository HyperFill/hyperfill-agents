// src/server.ts
import express from "express";
import { randomUUID } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { registerTools } from "../core/tools/index.js";
import { HyperFillMMClient } from "../market_clients/hyper-fillmm-client.js";
import { config } from "../services/config.js";
import { MarketManager } from "../services/market-manager.js";
const app = express();
app.use(express.json());
// create server once and register tools
const server = new McpServer({ name: "example-server", version: "1.0.0" });
const marketManager = new MarketManager();
const filamentApi = new HyperFillMMClient({ account: config.account, privateKey: config.privateKey, simulationMode: true });
registerTools(server, marketManager);
// session -> transport map
const transports = {};
// POST /mcp = client -> server (initialization or client messages)
app.post("/mcp", async (req, res) => {
    const sessionId = req.headers["mcp-session-id"];
    let transport;
    if (sessionId && transports[sessionId]) {
        transport = transports[sessionId];
    }
    else if (!sessionId && isInitializeRequest(req.body)) {
        // new session
        transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: () => randomUUID(),
            onsessioninitialized: (sid) => {
                transports[sid] = transport;
            },
            // consider enabling DNS rebinding protection in production
            // enableDnsRebindingProtection: true,
            // allowedHosts: ['127.0.0.1'],
        });
        transport.onclose = () => {
            if (transport.sessionId)
                delete transports[transport.sessionId];
        };
        // connect the pre-configured server (which already has tools registered)
        await server.connect(transport);
    }
    else {
        res.status(400).json({
            jsonrpc: "2.0",
            error: { code: -32000, message: "Bad Request: No valid session ID provided" },
            id: null
        });
        return;
    }
    // forward the HTTP request to the transport for handling
    await transport.handleRequest(req, res, req.body);
});
// GET /mcp and DELETE /mcp for SSE and session termination (unchanged)
const handleSessionRequest = async (req, res) => {
    const sessionId = req.headers["mcp-session-id"];
    if (!sessionId || !transports[sessionId]) {
        res.status(400).send("Invalid or missing session ID");
        return;
    }
    const transport = transports[sessionId];
    await transport.handleRequest(req, res);
};
app.get("/mcp", handleSessionRequest);
app.delete("/mcp", handleSessionRequest);
app.set("name", "MarketAnalyzer");
export default app;
