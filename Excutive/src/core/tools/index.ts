// src/writeTools.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import HyperFillClient from "../../services/HyperFillClient.js";

// Schema definitions for HyperFill API tools
const placeLimitOrderSchema = z.object({
    asset: z.string().describe("Asset pair (e.g., 'SEI/USDT', 'BTC/USDT')"),
    isBuy: z.boolean().describe("True for buy order, false for sell order"),
    price: z.string().describe("Limit price as string"),
    size: z.number().describe("Order size/quantity")
});

const placeMarketOrderSchema = z.object({
    asset: z.string().describe("Asset pair (e.g., 'SEI/USDT', 'BTC/USDT')"),
    isBuy: z.boolean().describe("True for buy order, false for sell order"),
    size: z.number().describe("Order size/quantity")
});

const cancelOrderSchema = z.object({
    orderId: z.string().describe("ID of the order to cancel"),
    asset: z.string().describe("Asset pair (e.g., 'SEI/USDT')"),
    side: z.string().describe("Order side ('bid' or 'ask')")
});

const getOrderbookSchema = z.object({
    asset: z.string().describe("Asset pair (e.g., 'SEI/USDT', 'BTC/USDT')")
});

const getBestOrderSchema = z.object({
    asset: z.string().describe("Asset pair (e.g., 'SEI/USDT', 'BTC/USDT')"),
    side: z.enum(["bid", "ask"]).describe("Side to get best order for")
});

const checkFundsSchema = z.object({
    asset: z.string().describe("Asset to check funds for (e.g., 'SEI', 'USDT')")
});

export function registerTools(server: McpServer, hyperFillClient: HyperFillClient) {

    // ===== ORDER PLACEMENT =====
    server.registerTool(
        "place_limit_order",
        {
            title: "Place Limit Order",
            description: "Place a limit order on HyperFill orderbook",
            inputSchema: placeLimitOrderSchema.shape,
        },
        async ({ asset, isBuy, price, size }) => {
            try {
                const result = await hyperFillClient.placeLimitOrder(asset, isBuy, price, size);

                if (result.success) {
                    return {
                        content: [{
                            type: "text",
                            text: `Order placed successfully!\nOrder ID: ${result.orderId}\nTrades: ${result.trades?.length || 0}\nMessage: ${result.message}`
                        }]
                    };
                } else {
                    return {
                        content: [{
                            type: "text",
                            text: `Order failed: ${result.message}`
                        }]
                    };
                }
            } catch (err: any) {
                return {
                    content: [{
                        type: "text",
                        text: `Error placing limit order: ${err.message}`
                    }]
                };
            }
        }
    );

    server.registerTool(
        "place_market_order",
        {
            title: "Place Market Order",
            description: "Place a market order on HyperFill orderbook",
            inputSchema: placeMarketOrderSchema.shape,
        },
        async ({ asset, isBuy, size }) => {
            try {
                const result = await hyperFillClient.placeMarketOrder(asset, isBuy, size);

                if (result.success) {
                    return {
                        content: [{
                            type: "text",
                            text: `Market order placed successfully!\nOrder ID: ${result.orderId}\nTrades: ${result.trades?.length || 0}\nMessage: ${result.message}`
                        }]
                    };
                } else {
                    return {
                        content: [{
                            type: "text",
                            text: `Market order failed: ${result.message}`
                        }]
                    };
                }
            } catch (err: any) {
                return {
                    content: [{
                        type: "text",
                        text: `Error placing market order: ${err.message}`
                    }]
                };
            }
        }
    );

    server.registerTool(
        "cancel_order",
        {
            title: "Cancel Order",
            description: "Cancel an existing order on HyperFill orderbook",
            inputSchema: cancelOrderSchema.shape,
        },
        async ({ orderId, asset, side }) => {
            try {
                const result = await hyperFillClient.cancelOrder(orderId, asset, side);

                if (result.success) {
                    return {
                        content: [{
                            type: "text",
                            text: `Order cancelled successfully\nMessage: ${result.message}`
                        }]
                    };
                } else {
                    return {
                        content: [{
                            type: "text",
                            text: `Cancel order failed: ${result.message}`
                        }]
                    };
                }
            } catch (err: any) {
                return {
                    content: [{
                        type: "text",
                        text: `Error canceling order: ${err.message}`
                    }]
                };
            }
        }
    );

    // ===== MARKET DATA =====
    server.registerTool(
        "get_orderbook",
        {
            title: "Get Orderbook",
            description: "Get current orderbook for an asset pair",
            inputSchema: getOrderbookSchema.shape,
        },
        async ({ asset }) => {
            try {
                const orderbook = await hyperFillClient.getOrderbook(asset);

                if (orderbook) {
                    return {
                        content: [{
                            type: "text",
                            text: `Orderbook for ${asset}:\nBest Bid: ${orderbook.bestBid}\nBest Ask: ${orderbook.bestAsk}\nSpread: ${orderbook.spread?.toFixed(2)}%\nBids: ${orderbook.bids.length}\nAsks: ${orderbook.asks.length}`
                        }]
                    };
                } else {
                    return {
                        content: [{
                            type: "text",
                            text: `Could not retrieve orderbook for ${asset}`
                        }]
                    };
                }
            } catch (err: any) {
                return {
                    content: [{
                        type: "text",
                        text: `Error getting orderbook: ${err.message}`
                    }]
                };
            }
        }
    );

    server.registerTool(
        "get_best_order",
        {
            title: "Get Best Order",
            description: "Get the best bid or ask order for an asset pair",
            inputSchema: getBestOrderSchema.shape,
        },
        async ({ asset, side }) => {
            try {
                const bestOrder = await hyperFillClient.getBestOrder(asset, side);

                if (bestOrder) {
                    return {
                        content: [{
                            type: "text",
                            text: `Best ${side} for ${asset}:\nPrice: ${bestOrder.price}\nQuantity: ${bestOrder.quantity}\nAccount: ${bestOrder.account}\nOrder ID: ${bestOrder.order_id}`
                        }]
                    };
                } else {
                    return {
                        content: [{
                            type: "text",
                            text: `No ${side} orders found for ${asset}`
                        }]
                    };
                }
            } catch (err: any) {
                return {
                    content: [{
                        type: "text",
                        text: `Error getting best order: ${err.message}`
                    }]
                };
            }
        }
    );

    server.registerTool(
        "check_funds",
        {
            title: "Check Available Funds",
            description: "Check locked funds for an asset",
            inputSchema: checkFundsSchema.shape,
        },
        async ({ asset }) => {
            try {
                const funds = await hyperFillClient.checkFunds(asset);

                if (funds) {
                    return {
                        content: [{
                            type: "text",
                            text: `Funds for ${asset}:\nAccount: ${funds.account}\nLocked Amount: ${funds.lockedAmount}`
                        }]
                    };
                } else {
                    return {
                        content: [{
                            type: "text",
                            text: `Could not retrieve funds information for ${asset}`
                        }]
                    };
                }
            } catch (err: any) {
                return {
                    content: [{
                        type: "text",
                        text: `Error checking funds: ${err.message}`
                    }]
                };
            }
        }
    );

}