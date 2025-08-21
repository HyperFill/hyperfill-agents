// src/readTools.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import HyperFillMMClient from "../../client/hyper-fillmm-client";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { getMidPriceGate } from "../../client/price-oracle-client";
import { config } from "../../services/config";

// Schema definitions for read tool inputs
const moveAssetAmountSchema = z.object({
    assetAmountToMove: z.string().describe("This is the asset amount to move from vault"),
});

const hyperfillOrderBookAbi = [
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "amount",
                "type": "uint256"
            },
            {
                "internalType": "address",
                "name": "tradingWallet",
                "type": "address"
            }
        ],
        "name": "moveFromVaultToWallet",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },

    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "amount",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "profitAmount",
                "type": "uint256"
            },
            {
                "internalType": "address",
                "name": "fromWallet",
                "type": "address"
            }
        ],
        "name": "moveFromWalletToVault",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    }
]

export function registerTools(server: McpServer, filamentApi: HyperFillMMClient, seiClientFactory: () => Promise<Client>) {

    // ===== ASSET MANAGEMENT (READ) =====
    server.registerTool(
        "move_assets_from_vault_to_wallet",
        {
            title: "Move to Agent Wallet",
            description: "Move a particular asset amount from vault to agent wallet",
        },
        async ({ assetAmountToMove }) => {
            try {
                const client = await seiClientFactory()

                const result = await client.callTool({
                    name: "write_contract",
                    arguments: {
                        contractAddress: config.vaultContractAddress,
                        abi: hyperfillOrderBookAbi,
                        functionName: "moveFromVaultToWallet",
                        args: [assetAmountToMove, config.agentWallet],
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
        "move_assets_from_wallet_to_vault",
        {
            title: "Move to vault Wallet",
            description: "Move a particular asset amount from agent to vault wallet",
        },
        async ({ assetAmountToMove }) => {
            try {
                const client = await seiClientFactory()

                const result = await client.callTool({
                    name: "write_contract",
                    arguments: {
                        contractAddress: config.vaultContractAddress,
                        abi: hyperfillOrderBookAbi,
                        functionName: "moveFromWalletToVault",
                        args: [assetAmountToMove, config.agentPrivateKey],
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
        "start_market_maker_bot",
        {
            title: "Move to vault Wallet",
            description: "Move a particular asset amount from agent to vault wallet",
        },
        async ({ assetAmountToMove }) => {
            try {
                const client = await seiClientFactory()

                const result = await client.callTool({
                    name: "write_contract",
                    arguments: {
                        contractAddress: config.vaultContractAddress,
                        abi: hyperfillOrderBookAbi,
                        functionName: "moveFromWalletToVault",
                        args: [assetAmountToMove, config.agentPrivateKey],
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


    // server.registerTool(
    //     "fetch_vault_asset_balance",
    //     {
    //         title: "Fetch Vault Asset Balance",
    //         description: "Fetches Vault Available Balance",
    //     },
    //     async () => {
    //         try {
    //             const client = await seiClientFactory()

    //             const result = await client.callTool({
    //                 name: "read_contract",
    //                 arguments: {
    //                     contractAddress: "0xbaC8D6A511A673fCE111D8c14c760aDE68116558",
    //                     abi: hyperfillAbi,
    //                     functionName: "totalSupply",
    //                     args: [],
    //                     network: "sei-testnet",

    //                 }
    //             });
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: JSON.stringify(result, null, 2)
    //                 }]
    //             };
    //         } catch (err: any) {
    //             return {
    //                 content: [{
    //                     type: "text",
    //                     text: `Error fetching assets: ${err.message}`
    //                 }]
    //             };
    //         }
    //     }
    // );
}