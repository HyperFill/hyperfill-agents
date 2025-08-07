import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { AdvancedMarketAnalyzer, FilamentAPIClient } from "./services/analyzer.js";

// Initialize core components
const filamentClient = new FilamentAPIClient();
const analyzer = new AdvancedMarketAnalyzer()
/// =====================
// TOOL DEFINITIONS
// =====================
export function registerTools(server: McpServer) {
  // Market analysis tool
  server.tool(
    "analyze_market",
    "Perform comprehensive market analysis for an asset",
    {
      asset: z.string().describe("Asset symbol to analyze (e.g., SEI, BTC, ETH)"),
      include_options: z.boolean().optional().describe("Include options analysis").default(false)
    },
    async ({ asset, include_options }) => {
      try {
        const marketData = await filamentClient.get_sei_market_data(asset);
        const momentum = await analyzer.analyze_momentum(marketData);
        const volume = await analyzer.analyze_volume_patterns(marketData);
        const opportunity = await analyzer.detect_opportunity(marketData);
        
        const result: any = {
          asset,
          price: marketData.price,
          volume: marketData.volume,
          volatility: marketData.volatility,
          momentum,
          volume_analysis: volume,
          opportunity: opportunity ? {
            action: opportunity.action,
            confidence: opportunity.confidence,
            reason: opportunity.reason
          } : null
        };
        
        if (include_options) {
          result.options = await analyzer.calculate_option_opportunities(marketData);
        }
        
        return {
          content: [{
            type: "text",
            text: JSON.stringify(result, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Analysis failed: ${error instanceof Error ? error.message : String(error)}`
          }],
          isError: true
        };
      }
    }
  );

  // Opportunity detection tool
  server.tool(
    "detect_opportunity",
    "Detect trading opportunities based on market conditions",
    {
      asset: z.string().describe("Asset symbol to analyze"),
      min_confidence: z.number().optional().describe("Minimum confidence threshold (0-1)").default(0.6)
    },
    async ({ asset, min_confidence }) => {
      try {
        const marketData = await filamentClient.get_sei_market_data(asset);
        const opportunity = await analyzer.detect_opportunity(marketData);
        
        if (!opportunity || opportunity.confidence < min_confidence) {
          return {
            content: [{
              type: "text",
              text: `No significant opportunity found for ${asset}`
            }]
          };
        }
        
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              asset,
              action: opportunity.action,
              confidence: opportunity.confidence,
              reason: opportunity.reason,
              expected_profit: opportunity.expected_profit,
              risk_score: opportunity.risk_score,
              option_price: opportunity.option_price,
              greeks: opportunity.greeks
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Opportunity detection failed: ${error instanceof Error ? error.message : String(error)}`
          }],
          isError: true
        };
      }
    }
  );

  // Portfolio analysis tool
  server.tool(
    "analyze_portfolio",
    "Analyze multiple assets for portfolio opportunities",
    {
      assets: z.array(z.string()).describe("Array of assets to analyze"),
      min_liquidity: z.number().optional().describe("Minimum liquidity threshold").default(10000)
    },
    async ({ assets, min_liquidity }) => {
      try {
        const results = [];
        let total_expected_return = 0;
        let total_risk = 0;
        let opportunity_count = 0;
        
        for (const asset of assets) {
          const marketData = await filamentClient.get_sei_market_data(asset);
          
          if (marketData.liquidity < min_liquidity) {
            results.push({ asset, status: "skipped", reason: "Insufficient liquidity" });
            continue;
          }
          
          const opportunity = await analyzer.detect_opportunity(marketData);
          
          if (opportunity) {
            results.push({
              asset,
              status: "opportunity",
              action: opportunity.action,
              confidence: opportunity.confidence,
              expected_profit: opportunity.expected_profit,
              risk_score: opportunity.risk_score
            });
            
            total_expected_return += opportunity.expected_profit * opportunity.confidence;
            total_risk += opportunity.risk_score;
            opportunity_count++;
          } else {
            results.push({ asset, status: "no_opportunity" });
          }
        }
        
        const avg_confidence = opportunity_count > 0 ? 
          results.reduce((sum, item) => sum + (item.confidence || 0), 0) / opportunity_count : 0;
        
        const sharpe_ratio = total_risk > 0 ? total_expected_return / total_risk : 0;
        
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              assets: results,
              portfolio_metrics: {
                total_expected_return,
                total_risk,
                opportunity_count,
                average_confidence: avg_confidence,
                sharpe_ratio
              }
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Portfolio analysis failed: ${error instanceof Error ? error.message : String(error)}`
          }],
          isError: true
        };
      }
    }
  );
}
