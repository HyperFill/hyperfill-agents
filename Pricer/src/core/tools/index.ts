// src/readTools.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import FilamentTrader from "../../services/FilamentClient.js";

// Schema definitions for read tool inputs
const fetchOrdersSchema = z.object({
    asset: z.string().optional().describe("Filter by asset (optional)"),
    side: z.enum(['BUY', 'SELL']).optional().describe("Filter by side (optional)"),
    page: z.number().optional().default(0).describe("Page number for pagination"),
    size: z.number().optional().default(10).describe("Number of items per page")
});

const fetchPositionsSchema = z.object({
    page: z.number().optional().default(0).describe("Page number for pagination"),
    size: z.number().optional().default(10).describe("Number of items per page")
});

const fetchTradeHistorySchema = z.object({
    page: z.number().optional().default(0).describe("Page number for pagination"),
    size: z.number().optional().default(10).describe("Number of items per page"),
    associatedOrderId: z.string().optional().describe("Filter by associated order ID (optional)")
});

const getOrderStatusSchema = z.object({
    orderIds: z.array(z.string()).describe("Array of order IDs to check status for")
});

const getAssetSchema = z.object({
    symbol: z.string().describe("Asset symbol to get info for")
});

const getPositionSchema = z.object({
    asset: z.string().describe("Asset symbol to get position for")
});

const getOrderSchema = z.object({
    orderId: z.string().describe("Order ID to get info for")
});

const hasOpenPositionSchema = z.object({
    asset: z.string().describe("Asset symbol to check for open position")
});

const hasOpenOrdersSchema = z.object({
    asset: z.string().optional().describe("Asset symbol to check for open orders (optional, checks all if not specified)")
});

export function registerTools(server: McpServer, filamentApi: FilamentTrader) {
    
    // ===== ASSET MANAGEMENT (READ) =====
    server.registerTool(
        "fetch_assets",
        {
            title: "Fetch Assets",
            description: "Fetch all available trading assets on Filament",
        },
        async () => {
            try {
                const result = await filamentApi.fetchAssets();
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
        "get_asset",
        {
            title: "Get Asset Info",
            description: "Get detailed information about a specific asset",
            inputSchema: getAssetSchema.shape,
        },
        async ({ symbol }) => {
            try {
                const asset = filamentApi.getAsset(symbol);
                if (!asset) {
                    return {
                        content: [{
                            type: "text",
                            text: `Asset ${symbol} not found. Try fetching assets first.`
                        }]
                    };
                }
                return {
                    content: [{
                        type: "text",
                        text: JSON.stringify(asset, null, 2)
                    }]
                };
            } catch (err: any) {
                return {
                    content: [{
                        type: "text",
                        text: `Error getting asset: ${err.message}`
                    }]
                };
            }
        }
    );

    // ===== DATA RETRIEVAL =====
    server.registerTool(
        "fetch_open_orders",
        {
            title: "Fetch Open Orders",
            description: "Fetch open orders with optional filtering",
            inputSchema: fetchOrdersSchema.shape,
        },
        async ({ asset, side, page, size }) => {
            try {
                const orders = await filamentApi.fetchOpenOrders(asset, side, page, size);
                return {
                    content: [{
                        type: "text",
                        text: JSON.stringify(orders, null, 2)
                    }]
                };
            } catch (err: any) {
                return {
                    content: [{
                        type: "text",
                        text: `Error fetching open orders: ${err.message}`
                    }]
                };
            }
        }
    );

    server.registerTool(
        "fetch_positions",
        {
            title: "Fetch Positions",
            description: "Fetch current positions",
            inputSchema: fetchPositionsSchema.shape,
        },
        async ({ page, size }) => {
            try {
                const positions = await filamentApi.fetchPositions(page, size);
                return {
                    content: [{
                        type: "text",
                        text: JSON.stringify(positions, null, 2)
                    }]
                };
            } catch (err: any) {
                return {
                    content: [{
                        type: "text",
                        text: `Error fetching positions: ${err.message}`
                    }]
                };
            }
        }
    );

    server.registerTool(
        "fetch_balance",
        {
            title: "Fetch Balance",
            description: "Fetch account balance",
        },
        async () => {
            try {
                const balance = await filamentApi.fetchBalance();
                return {
                    content: [{
                        type: "text",
                        text: `Account Balance: ${balance}`
                    }]
                };
            } catch (err: any) {
                return {
                    content: [{
                        type: "text",
                        text: `Error fetching balance: ${err.message}`
                    }]
                };
            }
        }
    );

    server.registerTool(
        "fetch_trade_history",
        {
            title: "Fetch Trade History",
            description: "Fetch trading history",
            inputSchema: fetchTradeHistorySchema.shape,
        },
        async ({ page, size, associatedOrderId }) => {
            try {
                const history = await filamentApi.fetchTradeHistory(page, size, associatedOrderId);
                return {
                    content: [{
                        type: "text",
                        text: JSON.stringify(history, null, 2)
                    }]
                };
            } catch (err: any) {
                return {
                    content: [{
                        type: "text",
                        text: `Error fetching trade history: ${err.message}`
                    }]
                };
            }
        }
    );

    server.registerTool(
        "get_order_status",
        {
            title: "Get Order Status",
            description: "Get status of specific orders",
            inputSchema: getOrderStatusSchema.shape,
        },
        async ({ orderIds }) => {
            try {
                const statuses = await filamentApi.getOrderStatus(orderIds);
                return {
                    content: [{
                        type: "text",
                        text: JSON.stringify(statuses, null, 2)
                    }]
                };
            } catch (err: any) {
                return {
                    content: [{
                        type: "text",
                        text: `Error getting order status: ${err.message}`
                    }]
                };
            }
        }
    );

    // ===== STATE QUERY FUNCTIONS =====
    server.registerTool(
        "get_position",
        {
            title: "Get Position",
            description: "Get a specific position from local state",
            inputSchema: getPositionSchema.shape,
        },
        async ({ asset }) => {
            try {
                const position = filamentApi.getPosition(asset);
                if (!position) {
                    return {
                        content: [{
                            type: "text",
                            text: `No position found for ${asset}`
                        }]
                    };
                }
                return {
                    content: [{
                        type: "text",
                        text: JSON.stringify(position, null, 2)
                    }]
                };
            } catch (err: any) {
                return {
                    content: [{
                        type: "text",
                        text: `Error getting position: ${err.message}`
                    }]
                };
            }
        }
    );

    server.registerTool(
        "get_order",
        {
            title: "Get Order",
            description: "Get a specific order from local state",
            inputSchema: getOrderSchema.shape,
        },
        async ({ orderId }) => {
            try {
                const order = filamentApi.getOrder(orderId);
                if (!order) {
                    return {
                        content: [{
                            type: "text",
                            text: `No order found with ID ${orderId}`
                        }]
                    };
                }
                return {
                    content: [{
                        type: "text",
                        text: JSON.stringify(order, null, 2)
                    }]
                };
            } catch (err: any) {
                return {
                    content: [{
                        type: "text",
                        text: `Error getting order: ${err.message}`
                    }]
                };
            }
        }
    );

    server.registerTool(
        "has_open_position",
        {
            title: "Check Open Position",
            description: "Check if there's an open position for an asset",
            inputSchema: hasOpenPositionSchema.shape,
        },
        async ({ asset }) => {
            try {
                const hasPosition = filamentApi.hasOpenPosition(asset);
                return {
                    content: [{
                        type: "text",
                        text: `Has open position for ${asset}: ${hasPosition}`
                    }]
                };
            } catch (err: any) {
                return {
                    content: [{
                        type: "text",
                        text: `Error checking position: ${err.message}`
                    }]
                };
            }
        }
    );

    server.registerTool(
        "has_open_orders",
        {
            title: "Check Open Orders",
            description: "Check if there are open orders, optionally for a specific asset",
            inputSchema: hasOpenOrdersSchema.shape,
        },
        async ({ asset }) => {
            try {
                const hasOrders = filamentApi.hasOpenOrders(asset);
                const message = asset
                    ? `Has open orders for ${asset}: ${hasOrders}`
                    : `Has open orders: ${hasOrders}`;

                return {
                    content: [{
                        type: "text",
                        text: message
                    }]
                };
            } catch (err: any) {
                return {
                    content: [{
                        type: "text",
                        text: `Error checking orders: ${err.message}`
                    }]
                };
            }
        }
    );

    // ===== UTILITY FUNCTIONS (READ) =====
    server.registerTool(
        "refresh_all_data",
        {
            title: "Refresh All Data",
            description: "Refresh assets, positions, orders, and balance data",
        },
        async () => {
            try {
                await filamentApi.refreshAllData();
                return {
                    content: [{
                        type: "text",
                        text: `All data refreshed successfully at ${filamentApi.lastUpdateTime}`
                    }]
                };
            } catch (err: any) {
                return {
                    content: [{
                        type: "text",
                        text: `Error refreshing data: ${err.message}`
                    }]
                };
            }
        }
    );

    server.registerTool(
        "get_cached_data",
        {
            title: "Get Cached Data",
            description: "Get all cached data (assets, positions, orders, balance)",
        },
        async () => {
            try {
                const data = {
                    assets: filamentApi.assets,
                    positions: filamentApi.positions,
                    openOrders: filamentApi.openOrders,
                    balance: filamentApi.balance,
                    lastUpdateTime: filamentApi.lastUpdateTime
                };

                return {
                    content: [{
                        type: "text",
                        text: JSON.stringify(data, null, 2)
                    }]
                };
            } catch (err: any) {
                return {
                    content: [{
                        type: "text",
                        text: `Error getting cached data: ${err.message}`
                    }]
                };
            }
        }
    );
}