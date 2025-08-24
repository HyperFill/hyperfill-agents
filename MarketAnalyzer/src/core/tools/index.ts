// src/readTools.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import HyperFillMMClient from "../../client/hyper-fillmm-client";
import { MarketManager } from "../../services/market-manager";

// Schema definitions for read tool inputs
const marketSelectionSchema = z.object({
    marketName: z.string().describe("Name of the market (e.g., 'hyperfill')")
});

const getOrderSchema = z.object({
    marketName: z.string().describe("Name of the market"),
    orderId: z.string().describe("Order ID to retrieve")
});

const getOrderBookSchema = z.object({
    marketName: z.string().describe("Name of the market"),
    symbol: z.string().describe("Trading pair symbol (e.g., 'SEI_USDT')")
});

const getBestOrderSchema = z.object({
    marketName: z.string().describe("Name of the market"),
    baseAsset: z.string().describe("Base asset (e.g., 'SEI')"),
    quoteAsset: z.string().describe("Quote asset (e.g., 'USDT')"),
    side: z.enum(['bid', 'ask']).describe("Order side - 'bid' for buy orders, 'ask' for sell orders")
});

const checkFundsSchema = z.object({
    marketName: z.string().describe("Name of the market"),
    asset: z.string().describe("Asset to check funds for (e.g., 'SEI', 'USDT')")
});

export function registerTools(server: McpServer, marketManager: MarketManager) {

    // Helper function to get market client
    const getMarketClient = (marketName: string): HyperFillMMClient | null => {
        const client = marketManager.getMarketClient(marketName);
        if (!client) {
            throw new Error(`Market '${marketName}' not found or not supported`);
        }
        return client;
    };

    // ===== MARKET MANAGEMENT =====
    server.registerTool(
        "get_supported_markets",
        {
            title: "Get Supported Markets",
            description: "Get list of all supported markets",
        },
        async () => {
            try {
                const markets = marketManager.getMarketList();
                return {
                    content: [{
                        type: "text",
                        text: JSON.stringify(markets, null, 2)
                    }]
                };
            } catch (err: any) {
                return {
                    content: [{
                        type: "text",
                        text: `Error fetching supported markets: ${err.message}`
                    }]
                };
            }
        }
    );

    // ===== ORDER MANAGEMENT (READ) =====
    server.registerTool(
        "get_order",
        {
            title: "Get Order Details",
            description: "Retrieve details of a specific order by ID",
            inputSchema: getOrderSchema.shape,
        },
        async ({ marketName, orderId }) => {
            try {
                const client = getMarketClient(marketName);
                const result = await client!.getOrder(orderId);
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
                        text: `Error fetching order ${orderId} from ${marketName}: ${err.message}`
                    }]
                };
            }
        }
    );

    server.registerTool(
        "get_orderbook",
        {
            title: "Get Order Book",
            description: "Retrieve the order book for a trading pair",
            inputSchema: getOrderBookSchema.shape,
        },
        async ({ marketName, symbol }) => {
            try {
                const client = getMarketClient(marketName);
                const result = await client!.getOrderBook(symbol);
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
                        text: `Error fetching orderbook for ${symbol} from ${marketName}: ${err.message}`
                    }]
                };
            }
        }
    );

    server.registerTool(
        "get_best_order",
        {
            title: "Get Best Order",
            description: "Get the best bid or ask order for a trading pair",
            inputSchema: getBestOrderSchema.shape,
        },
        async ({ marketName, baseAsset, quoteAsset, side }) => {
            try {
                const client = getMarketClient(marketName);
                const result = await client!.getBestOrder(baseAsset, quoteAsset, side);
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
                        text: `Error fetching best ${side} for ${baseAsset}/${quoteAsset} from ${marketName}: ${err.message}`
                    }]
                };
            }
        }
    );

    server.registerTool(
        "get_best_bid",
        {
            title: "Get Best Bid",
            description: "Get the best bid (buy) order for a trading pair",
            inputSchema: z.object({
                marketName: z.string().describe("Name of the market"),
                baseAsset: z.string().describe("Base asset (e.g., 'SEI')"),
                quoteAsset: z.string().describe("Quote asset (e.g., 'USDT')")
            }).shape,
        },
        async ({ marketName, baseAsset, quoteAsset }) => {
            try {
                const client = getMarketClient(marketName);
                const result = await client!.getBestBid(baseAsset, quoteAsset);
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
                        text: `Error fetching best bid for ${baseAsset}/${quoteAsset} from ${marketName}: ${err.message}`
                    }]
                };
            }
        }
    );

    server.registerTool(
        "get_best_ask",
        {
            title: "Get Best Ask",
            description: "Get the best ask (sell) order for a trading pair",
            inputSchema: z.object({
                marketName: z.string().describe("Name of the market"),
                baseAsset: z.string().describe("Base asset (e.g., 'SEI')"),
                quoteAsset: z.string().describe("Quote asset (e.g., 'USDT')")
            }).shape,
        },
        async ({ marketName, baseAsset, quoteAsset }) => {
            try {
                const client = getMarketClient(marketName);
                const result = await client!.getBestAsk(baseAsset, quoteAsset);
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
                        text: `Error fetching best ask for ${baseAsset}/${quoteAsset} from ${marketName}: ${err.message}`
                    }]
                };
            }
        }
    );

    // ===== FUNDS MANAGEMENT (READ) =====
    server.registerTool(
        "check_available_funds",
        {
            title: "Check Available Funds",
            description: "Check locked/available funds for a specific asset",
            inputSchema: checkFundsSchema.shape,
        },
        async ({ marketName, asset }) => {
            try {
                const client = getMarketClient(marketName);
                const result = await client!.checkAvailableFunds(asset);
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
                        text: `Error checking funds for ${asset} in ${marketName}: ${err.message}`
                    }]
                };
            }
        }
    );

    // ===== MARKET OVERVIEW HELPER =====
    server.registerTool(
        "get_market_overview",
        {
            title: "Get Market Overview",
            description: "Get comprehensive market data including orderbook, best orders, and locked funds for a trading pair",
            inputSchema: z.object({
                marketName: z.string().describe("Name of the market"),
                baseAsset: z.string().describe("Base asset (e.g., 'SEI')"),
                quoteAsset: z.string().describe("Quote asset (e.g., 'USDT')")
            }).shape,
        },
        async ({ marketName, baseAsset, quoteAsset }) => {
            try {
                const client = getMarketClient(marketName);
                const result = await client!.getMarketOverview(baseAsset, quoteAsset);
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
                        text: `Error fetching market overview for ${baseAsset}/${quoteAsset} from ${marketName}: ${err.message}`
                    }]
                };
            }
        }
    );

    // ===== SETTLEMENT HEALTH =====
    server.registerTool(
        "get_settlement_health",
        {
            title: "Get Settlement Health",
            description: "Check the health status of the settlement system",
            inputSchema: marketSelectionSchema.shape,
        },
        async ({ marketName }) => {
            try {
                const client = getMarketClient(marketName);
                const result = await client!.getSettlementHealth();
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
                        text: `Error checking settlement health for ${marketName}: ${err.message}`
                    }]
                };
            }
        }
    );

    // ===== UTILITY HELPERS =====
    server.registerTool(
        "format_symbol",
        {
            title: "Format Trading Symbol",
            description: "Format base and quote assets into a trading symbol",
            inputSchema: z.object({
                baseAsset: z.string().describe("Base asset (e.g., 'SEI')"),
                quoteAsset: z.string().describe("Quote asset (e.g., 'USDT')")
            }).shape,
        },
        async ({ baseAsset, quoteAsset }) => {
            try {
                const symbol = HyperFillMMClient.formatSymbol(baseAsset, quoteAsset);
                return {
                    content: [{
                        type: "text",
                        text: `Formatted symbol: ${symbol}`
                    }]
                };
            } catch (err: any) {
                return {
                    content: [{
                        type: "text",
                        text: `Error formatting symbol: ${err.message}`
                    }]
                };
            }
        }
    );

    server.registerTool(
        "parse_symbol",
        {
            title: "Parse Trading Symbol",
            description: "Parse a trading symbol into base and quote assets",
            inputSchema: z.object({
                symbol: z.string().describe("Trading symbol (e.g., 'SEI_USDT')")
            }).shape,
        },
        async ({ symbol }) => {
            try {
                const parsed = HyperFillMMClient.parseSymbol(symbol);
                return {
                    content: [{
                        type: "text",
                        text: JSON.stringify(parsed, null, 2)
                    }]
                };
            } catch (err: any) {
                return {
                    content: [{
                        type: "text",
                        text: `Error parsing symbol: ${err.message}`
                    }]
                };
            }
        }
    );
}