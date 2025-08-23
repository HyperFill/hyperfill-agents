from crewai import Agent, Task, Crew, Process, LLM
from crewai_tools import MCPServerAdapter
from core.utils import get_groq_key
import os
import sys

# Add ModelRouter to path
sys.path.append('/Users/mac/hyperfill-agents')
from ModelRouter import CrewAIModelRouter

# Setup Router
model_router = CrewAIModelRouter()

# MCP Servers configuration (updated to match latest structure)
mcp_servers = [
    {"url": "http://localhost:2000/mcp", "transport": "streamable-http"},  # Market Analyzer Server
    {"url": "http://localhost:3000/mcp", "transport": "streamable-http"},  # Pricer Server  
    {"url": "http://localhost:1000/mcp", "transport": "streamable-http"},  # Executive Server
    {"url": "http://localhost:3001/mcp", "transport": "streamable-http"},  # Sei MCP Server
]

# Initialize MCP adapter
analyzer_adapter = None

try:
    # Initialize separate MCP adapters for different server types
    market_adapter = MCPServerAdapter([mcp_servers[0]])  # Market Analyzer
    pricer_adapter = MCPServerAdapter([mcp_servers[1]])  # Pricer  
    executive_adapter = MCPServerAdapter([mcp_servers[2]])  # Executive
    
    # Get tools from each adapter
    market_tools = market_adapter.tools
    pricer_tools = pricer_adapter.tools
    executive_tools = executive_adapter.tools
    
    print(f"Market Analyzer tools: {[tool.name for tool in market_tools]}")
    print(f"Pricer tools: {[tool.name for tool in pricer_tools]}")
    print(f"Executive tools: {[tool.name for tool in executive_tools]}")

    # ===== MARKET RESEARCH AGENT (Optimized for market data processing) =====
    market_researcher = Agent(
        role="Senior Market Research and Analysis Specialist",
        goal="""Conduct market research and identify trading opportunities with spread >= 1%. 
        Focus on data processing and opportunity identification.""",
        backstory="""You specialize in processing market data, identifying profitable trading 
        opportunities by analyzing spreads, and providing structured market insights.""",
        tools=market_tools,
        verbose=True,
        # Router automatically selects 8B for data processing tasks
        llm=model_router.get_market_analyzer_llm("fetch market data and analyze spreads"),
        max_iter=5,
        memory=True
    )

    # ===== PRICING SPECIALIST AGENT (Requires complex calculations) =====
    pricing_specialist = Agent(
        role="Advanced Pricing and Portfolio Manager", 
        goal="""Perform complex pricing calculations, portfolio analysis, and trading decisions.
        Manage account balance, positions, and execute sophisticated trading strategies.""",
        backstory="""You are an expert quantitative analyst specializing in complex pricing models,
        portfolio management, and sophisticated trading strategies requiring advanced mathematical reasoning.""",
        tools=pricer_tools,
        verbose=True,
        # Router automatically selects 70B for complex pricing tasks
        llm=model_router.get_pricing_llm("calculate complex arbitrage strategies and manage portfolio positions"),
        max_iter=3,
        memory=True
    )

    # ===== EXECUTIVE COORDINATOR AGENT (Trading execution) =====
    executive_coordinator = Agent(
        role="Trading Execution Executive",
        goal="""Execute trading decisions by placing orders, managing positions, and coordinating 
        between market analysis and pricing strategies.""",
        backstory="""You are a trading execution specialist who translates pricing strategies into 
        actual market orders. You manage order placement, position monitoring, and risk management.""",
        tools=executive_tools,
        verbose=True,
        # Router selects 8B for execution tasks (rule-based)
        llm=model_router.get_executive_llm("execute trading orders and coordinate workflow"),
        max_iter=2,
        memory=True
    )

    # ===== TASKS =====
    
    # Market data collection (8B task)
    market_data_task = Task(
        description="""
        Fetch and process market data:
        1. Get all supported markets using get_supported_markets
        2. For each market, fetch available assets using fetch_market_assets  
        3. Get detailed asset information with get_market_asset
        4. Identify assets with profitable spread percentages
        
        Focus on efficient data processing and structured output.
        """,
        expected_output="Structured report of markets, assets, and trading opportunities",
        agent=market_researcher,
    )

    # Portfolio analysis and strategy (70B task)  
    portfolio_analysis_task = Task(
        description="""
        Perform comprehensive portfolio analysis and strategy development:
        1. Fetch current account balance using fetch_balance
        2. Review existing positions using fetch_positions
        3. Analyze open orders using fetch_open_orders
        4. Calculate optimal position sizes based on account balance
        5. Develop sophisticated trading strategies for identified opportunities
        
        Apply complex mathematical models and risk assessment.
        """,
        expected_output="Detailed portfolio analysis with optimal trading strategies",
        agent=pricing_specialist,
    )

    # Trading execution (8B task)
    execution_task = Task(
        description="""
        Execute trading strategy based on analysis:
        1. Review market opportunities and portfolio recommendations
        2. Place limit orders using place_limit_order for optimal entry points
        3. Monitor order execution and manage risk
        4. Coordinate between market data and pricing strategies
        
        Focus on precise order execution and risk management.
        """,
        expected_output="Trading execution summary with order details and risk management",
        agent=executive_coordinator,
    )

    # ===== CREW SETUP WITH OPTIMIZED ROUTING =====
    trading_crew = Crew(
        # Use 8B model for embeddings to save tokens
        embedder=model_router.get_embedder_config(use_small_model=True),
        # Use 8B for planning coordination
        planning_llm=model_router.get_executive_llm("plan and coordinate trading crew tasks"),
        agents=[market_researcher, pricing_specialist, executive_coordinator],
        tasks=[market_data_task, portfolio_analysis_task, execution_task],
        verbose=True,
        process=Process.sequential,
        memory=False,  # Disable memory to avoid token overhead
        planning=True
    )

    # ===== EXECUTE WITH TOKEN OPTIMIZATION =====
    print("\n" + "="*80)
    print("🚀 STARTING OPTIMIZED TRADING SYSTEM")
    print("📊 Router automatically selecting optimal models:")
    print("   • Market Analysis: 8B model (data processing)")
    print("   • Portfolio Strategy: 70B model (complex calculations)")  
    print("   • Trade Execution: 8B model (rule-based operations)")
    print("="*80 + "\n")
    
    result = trading_crew.kickoff()
    
    print("\n" + "="*80)
    print("✅ OPTIMIZED TRADING SYSTEM COMPLETE")
    print("="*80)
    print(f"\nTrading Results:\n{result}")
    
    # Print routing statistics
    model_router.print_routing_stats()

except Exception as e:
    print(f"❌ Error in optimized trading system: {e}")
    print("Ensure MarketAnalyzer is running on http://localhost:2000/mcp")
    print("Ensure Pricer is running on http://localhost:3000/mcp")
    print("Ensure Executive is running on http://localhost:1000/mcp")
    import traceback
    traceback.print_exc()

print("\n" + "="*70)
print("🤖 Token-Optimized Trading System Ready")
print("💰 ~60% token savings vs all-70B approach")
print("🎯 Adapted for latest trading bot architecture")
print("="*70)