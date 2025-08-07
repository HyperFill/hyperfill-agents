import { McpServer, ResourceTemplate} from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { AdvancedMarketAnalyzer, MarketData, Opportunity, ActionType } from "./analyzer"; // Import your Python classes
import { FilamentAPIClient } from "./services/analyzer.js";


// =====================
// RESOURCE DEFINITIONS
// =====================

const filamentClient = new FilamentAPIClient()

export function registerResources(server: McpServer) {
  // Market data resource
  server.resource(
    "market_data",
    new ResourceTemplate("filament://market/{asset}", { asset: "SEI" }),
    async (uri, params) => {
      try {
        const asset = params.asset as string;
        const marketData = await filamentClient.get_sei_market_data(asset);
        
        return {
          contents: [{
            uri: uri.href,
            text: JSON.stringify({
              pair: marketData.pair,
              price: marketData.price,
              volume: marketData.volume,
              liquidity: marketData.liquidity,
              spread: marketData.spread,
              volatility: marketData.volatility,
              timestamp: marketData.timestamp.toISOString()
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          contents: [{
            uri: uri.href,
            text: `Error fetching market data: ${error instanceof Error ? error.message : String(error)}`
          }]
        };
      }
    }
  );

  // Option pricing resource
  server.resource(
    "option_pricing",
    new ResourceTemplate("filament://options/{asset}", { asset: "SEI" }),
    async (uri, params) => {
      try {
        const asset = params.asset as string;
        const marketData = await filamentClient.get_sei_market_data(asset);
        const options = await analyzer.calculate_option_opportunities(marketData);
        
        return {
          contents: [{
            uri: uri.href,
            text: JSON.stringify(options.map(opt => ({
              type: opt.option_type,
              strike: opt.strike_price,
              expiry: opt.time_to_expiry,
              price: opt.option_price,
              delta: opt.delta,
              gamma: opt.gamma
            })), null, 2)
          }]
        };
      } catch (error) {
        return {
          contents: [{
            uri: uri.href,
            text: `Error calculating options: ${error instanceof Error ? error.message : String(error)}`
          }]
        };
      }
    }
  );
}