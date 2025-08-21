import { z } from "zod";
// Schema definitions for write tool inputs
const placeLimitOrderSchema = z.object({
    asset: z.string().describe("Asset symbol (e.g., 'ETH', 'BTC')"),
    isBuy: z.boolean().describe("True for buy order, false for sell order"),
    price: z.string().describe("Limit price as string"),
    size: z.number().describe("Order size"),
    leverage: z.number().optional().describe("Leverage (optional, defaults to configured default)"),
    reduceOnly: z.boolean().optional().default(false).describe("Whether this is a reduce-only order")
});
const placeMarketOrderSchema = z.object({
    asset: z.string().describe("Asset symbol (e.g., 'ETH', 'BTC')"),
    isBuy: z.boolean().describe("True for buy order, false for sell order"),
    size: z.number().describe("Order size"),
    leverage: z.number().optional().describe("Leverage (optional, defaults to configured default)"),
    slippage: z.number().optional().describe("Slippage tolerance (optional, defaults to configured default)"),
    reduceOnly: z.boolean().optional().default(false).describe("Whether this is a reduce-only order")
});
const cancelOrderSchema = z.object({
    orderId: z.string().describe("ID of the order to cancel")
});
const closePositionSchema = z.object({
    asset: z.string().describe("Asset symbol to close position for"),
    closePrice: z.string().describe("Price to close at"),
    quantity: z.number().optional().describe("Quantity to close (optional, closes entire position if not specified)")
});
const collateralSchema = z.object({
    asset: z.string().describe("Asset symbol"),
    collateral: z.number().describe("Collateral amount"),
    isBuy: z.boolean().describe("Position direction")
});
const takeProfitStopLossSchema = z.object({
    asset: z.string().describe("Asset symbol"),
    price: z.string().describe("Take profit or stop loss price"),
    size: z.string().describe("Position size"),
    isBuy: z.boolean().describe("Position direction")
});
export function registerTools(server, filamentApi) {
    // ===== ORDER PLACEMENT =====
    server.registerTool("place_limit_order", {
        title: "Place Limit Order",
        description: "Place a limit order on Filament",
        inputSchema: placeLimitOrderSchema.shape,
    }, async ({ asset, isBuy, price, size, leverage, reduceOnly }) => {
        try {
            const result = await filamentApi.placeLimitOrder(asset, isBuy, price, size, leverage, reduceOnly);
            const responseText = await result.response.text();
            return {
                content: [{
                        type: "text",
                        text: `Order placed successfully!\nOrder ID: ${result.orderId}\nResponse: ${responseText}`
                    }]
            };
        }
        catch (err) {
            return {
                content: [{
                        type: "text",
                        text: `Error placing limit order: ${err.message}`
                    }]
            };
        }
    });
    server.registerTool("place_market_order", {
        title: "Place Market Order",
        description: "Place a market order on Filament",
        inputSchema: placeMarketOrderSchema.shape,
    }, async ({ asset, isBuy, size, leverage, slippage, reduceOnly }) => {
        try {
            const result = await filamentApi.placeMarketOrder(asset, isBuy, size, leverage, slippage, reduceOnly);
            const responseText = await result.response.text();
            return {
                content: [{
                        type: "text",
                        text: `Market order placed successfully!\nOrder ID: ${result.orderId}\nResponse: ${responseText}`
                    }]
            };
        }
        catch (err) {
            return {
                content: [{
                        type: "text",
                        text: `Error placing market order: ${err.message}`
                    }]
            };
        }
    });
    server.registerTool("cancel_order", {
        title: "Cancel Order",
        description: "Cancel an existing order",
        inputSchema: cancelOrderSchema.shape,
    }, async ({ orderId }) => {
        try {
            const response = await filamentApi.cancelOrder(orderId);
            const responseText = await response.text();
            return {
                content: [{
                        type: "text",
                        text: `Cancel order request sent.\nResponse: ${responseText}`
                    }]
            };
        }
        catch (err) {
            return {
                content: [{
                        type: "text",
                        text: `Error canceling order: ${err.message}`
                    }]
            };
        }
    });
    // ===== POSITION MANAGEMENT =====
    server.registerTool("close_position", {
        title: "Close Position",
        description: "Close an existing position",
        inputSchema: closePositionSchema.shape,
    }, async ({ asset, closePrice, quantity }) => {
        try {
            const result = await filamentApi.closePosition(asset, closePrice, quantity);
            const responseText = await result.response.text();
            return {
                content: [{
                        type: "text",
                        text: `Position close order placed!\nOrder ID: ${result.orderId}\nResponse: ${responseText}`
                    }]
            };
        }
        catch (err) {
            return {
                content: [{
                        type: "text",
                        text: `Error closing position: ${err.message}`
                    }]
            };
        }
    });
    server.registerTool("add_collateral", {
        title: "Add Collateral",
        description: "Add collateral to a position",
        inputSchema: collateralSchema.shape,
    }, async ({ asset, collateral, isBuy }) => {
        try {
            const response = await filamentApi.addCollateral(asset, collateral, isBuy);
            const responseText = await response.text();
            return {
                content: [{
                        type: "text",
                        text: `Add collateral request sent.\nResponse: ${responseText}`
                    }]
            };
        }
        catch (err) {
            return {
                content: [{
                        type: "text",
                        text: `Error adding collateral: ${err.message}`
                    }]
            };
        }
    });
    server.registerTool("remove_collateral", {
        title: "Remove Collateral",
        description: "Remove collateral from a position",
        inputSchema: collateralSchema.shape,
    }, async ({ asset, collateral, isBuy }) => {
        try {
            const response = await filamentApi.removeCollateral(asset, collateral, isBuy);
            const responseText = await response.text();
            return {
                content: [{
                        type: "text",
                        text: `Remove collateral request sent.\nResponse: ${responseText}`
                    }]
            };
        }
        catch (err) {
            return {
                content: [{
                        type: "text",
                        text: `Error removing collateral: ${err.message}`
                    }]
            };
        }
    });
    server.registerTool("set_take_profit", {
        title: "Set Take Profit",
        description: "Set a take profit order for a position",
        inputSchema: takeProfitStopLossSchema.shape,
    }, async ({ asset, price, size, isBuy }) => {
        try {
            const response = await filamentApi.setTakeProfit(asset, price, size, isBuy);
            const responseText = await response.text();
            return {
                content: [{
                        type: "text",
                        text: `Take profit set successfully.\nResponse: ${responseText}`
                    }]
            };
        }
        catch (err) {
            return {
                content: [{
                        type: "text",
                        text: `Error setting take profit: ${err.message}`
                    }]
            };
        }
    });
    server.registerTool("set_stop_loss", {
        title: "Set Stop Loss",
        description: "Set a stop loss order for a position",
        inputSchema: takeProfitStopLossSchema.shape,
    }, async ({ asset, price, size, isBuy }) => {
        try {
            const response = await filamentApi.setStopLoss(asset, price, size, isBuy);
            const responseText = await response.text();
            return {
                content: [{
                        type: "text",
                        text: `Stop loss set successfully.\nResponse: ${responseText}`
                    }]
            };
        }
        catch (err) {
            return {
                content: [{
                        type: "text",
                        text: `Error setting stop loss: ${err.message}`
                    }]
            };
        }
    });
}
