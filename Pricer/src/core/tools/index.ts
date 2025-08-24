// src/readTools.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import FilamentTrader from "../../services/FilamentClient";
import HyperFillMMClient from "../../client/hyper-fillmm-client";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { getMidPriceGate } from "../../client/price-oracle-client";
import { config } from "dotenv";

config()

// Schema definitions for read tool inputs
const fetchOraclePriceSchema = z.object({
    base: z.string().describe("This is the base currency of the asset pair"),
    quote: z.string().describe("this is the quote currency of the asset pair")
});

const hyperfillAbi = [
    {
        "inputs": [],
        "name": "totalSupply",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    }
]

export function registerTools(server: McpServer, hyperfillMMApi: HyperFillMMClient, seiClientFactory: () => Promise<Client>) {

    // ===== ASSET MANAGEMENT (READ) =====
    server.registerTool(
        "fetch_vault_asset_balance",
        {
            title: "vault balance",
            description: "Fetches Vault Available Balance",
        },
        async () => {
            try {
                const client = await seiClientFactory()

                const result = await client.callTool({
                    name: "read_contract",
                    arguments: {
                        contractAddress: process.env.VAULT_CONTRACT_ADDRESS,
                        abi: hyperfillAbi,
                        functionName: "totalSupply",
                        args: [],
                        network: "sei-testnet",

                    }
                });
                return {
                    content: [{
                        type: "text",
                        text: JSON.stringify(result, null, 2)
                    }]
                };
            } catch (err: any) {
                return {
                    content: [{
                        type: "text",
                        text: `Error fetching assets: ${err.message}`
                    }]
                };
            }
        }
    );

    server.registerTool(
        "fetch_oracle_price",
        {
            title: "Fetch Oracle Price",
            description: "Fetch Oracle Price",
            inputSchema: fetchOraclePriceSchema.shape
        },
        async ({ base, quote }) => {
            try {
                const result = await getMidPriceGate({ base, quote })
                return {
                    content: [{
                        type: "text",
                        text: JSON.stringify(result, null, 2)
                    }]
                };
            } catch (err: any) {
                return {
                    content: [{
                        type: "text",
                        text: `Error fetching assets: ${err.message}`
                    }]
                };
            }
        }
    );

}