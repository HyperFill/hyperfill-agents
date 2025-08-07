import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { AdvancedMarketAnalyzer, FilamentAPIClient } from "./services/analyzer.js";
// import { FilamentAPIClient } from "./filament-client";

// Initialize core components
const filamentClient = new FilamentAPIClient();
const analyzer = new AdvancedMarketAnalyzer();

// =====================
// PROMPT DEFINITIONS
// =====================
export function registerFilamPrompts(server: McpServer) {
  // AI market analysis prompt
  server.prompt(
    "ai_market_analysis",
    "Get AI-powered market analysis and trading recommendations",
    {
      asset: z.string().describe("Asset symbol to analyze"),
      time_horizon: z.string().optional().describe("Investment time horizon").default("short-term")
    },
    ({ asset, time_horizon }) => ({
      messages: [{
        role: "user",
        content: {
          type: "text",
          text: `Act as an expert quantitative analyst. Provide comprehensive analysis for ${asset} with ${time_horizon} investment horizon. 
          Include: 
          1. Technical assessment (momentum, volume, volatility)
          2. Fundamental positioning
          3. Trading strategy recommendations
          4. Risk management considerations
          5. Options strategies (if applicable)
          
          Format response with clear sections and actionable insights.`
        }
      }]
    })
  );

  // Opportunity explanation prompt
  server.prompt(
    "explain_opportunity",
    "Explain a detected trading opportunity in detail",
    {
      asset: z.string().describe("Asset symbol"),
      action: z.nativeEnum(ActionType).describe("Recommended action"),
      confidence: z.number().describe("Confidence score (0-1)"),
      context: z.string().describe("Market context JSON")
    },
    ({ asset, action, confidence, context }) => ({
      messages: [{
        role: "user",
        content: {
          type: "text",
          text: `Explain this trading opportunity to a sophisticated investor:
          - Asset: ${asset}
          - Action: ${action}
          - Confidence: ${(confidence * 100).toFixed(1)}%
          - Market Context: ${context}
          
          Structure your response:
          1. Opportunity rationale
          2. Key supporting metrics
          3. Potential risks
          4. Position sizing recommendations
          5. Profit targets and stop levels`
        }
      }]
    })
  );

  // Risk assessment prompt
  server.prompt(
    "assess_risk",
    "Perform comprehensive risk assessment for a trading opportunity",
    {
      asset: z.string().describe("Asset symbol"),
      action: z.nativeEnum(ActionType).describe("Proposed action"),
      position_size: z.number().describe("Position size in USD")
    },
    ({ asset, action, position_size }) => ({
      messages: [{
        role: "user",
        content: {
          type: "text",
          text: `Conduct rigorous risk assessment for this trade:
          - Asset: ${asset}
          - Action: ${action}
          - Position Size: $${position_size.toLocaleString()}
          
          Evaluate:
          1. Market risk factors
          2. Liquidity constraints
          3. Portfolio correlation
          4. Stress testing scenarios
          5. Recommended risk mitigation strategies
          
          Provide quantitative risk metrics where possible.`
        }
      }]
    })
  );
}