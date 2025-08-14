// src/tools.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
const addSchema = z.object({ a: z.number(), b: z.number() })

export function registerPricerTools(server: McpServer) {
    server.registerTool(
        "add",
        {
            title: "Addition",
            description: "Add two numbers",
            inputSchema: addSchema.shape,
        },
        async ({ a, b }) => {
            return {
                content: [{ type: "text", text: String(a + b) }]
            };
        }
    );

    // register more tools...
}
