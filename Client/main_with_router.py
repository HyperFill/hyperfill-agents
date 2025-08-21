from crewai import Agent, Task, Crew, Process
from crewai_tools import MCPServerAdapter
from core.utils import get_groq_key
import os
import sys

# Add ModelRouter to path
sys.path.append('/Users/mac/hyperfill-agents')
from ModelRouter import CrewAIModelRouter

# Setup Router
model_router = CrewAIModelRouter()

# MCP Servers configuration
mcp_servers = [
    {"url": "http://localhost:2000/mcp", "transport": "streamable-http"},  # Market Analyzer Server
    {"url": "http://localhost:3001/mcp", "transport": "streamable-http"},  # Sei MCP Server
]

# Initialize MCP adapter
analyzer_adapter = None

try:
    # Initialize the MCP adapter
    analyzer_adapter = MCPServerAdapter(mcp_servers)
    analyzer_tools = analyzer_adapter.tools
    
    print(f"Market Analyzer tools available: {[tool.name for tool in analyzer_tools]}")

    # ===== MARKET RESEARCH AGENT (Optimized for market data processing) =====
    market_researcher = Agent(
        role="Senior Market Research and Analysis Specialist",
        goal="""Conduct market research and identify trading opportunities with spread >= 1%. 
        Focus on data processing and opportunity identification.""",
        backstory="""You specialize in processing market data, identifying profitable trading 
        opportunities by analyzing spreads, and providing structured market insights.""",
        tools=analyzer_tools,
        verbose=True,
        # Router automatically selects 7B for data processing tasks
        llm=model_router.get_market_analyzer_llm("fetch market data and analyze spreads"),
        max_iter=5,
        memory=True
    )

    # ===== PRICING SPECIALIST AGENT (Requires complex calculations) =====
    pricing_specialist = Agent(
        role="Advanced Pricing and Arbitrage Specialist", 
        goal="""Perform complex pricing calculations, arbitrage analysis, and profit optimization.
        Calculate optimal entry/exit points and risk-adjusted returns.""",
        backstory="""You are an expert quantitative analyst specializing in complex pricing models,
        arbitrage detection, and sophisticated trading strategies requiring advanced mathematical reasoning.""",
        tools=analyzer_tools,
        verbose=True,
        # Router automatically selects 70B for complex pricing tasks
        llm=model_router.get_pricing_llm("calculate arbitrage opportunities and complex pricing strategies"),
        max_iter=3,
        memory=True
    )

    # ===== EXECUTIVE COORDINATOR AGENT (Simple coordination tasks) =====
    executive_coordinator = Agent(
        role="Trading Operations Executive",
        goal="""Coordinate between market research and pricing teams. Manage workflow and 
        ensure efficient task delegation.""",
        backstory="""You manage trading operations, coordinate team activities, and ensure
        smooth workflow between market analysis and pricing execution.""",
        tools=[],  # Coordination only, no external tools needed
        verbose=True,
        # Router selects 7B for simple coordination
        llm=model_router.get_executive_llm("coordinate tasks and manage workflow"),
        max_iter=2,
        memory=True
    )

    # ===== TASKS =====
    
    # Market data collection (7B task)
    market_data_task = Task(
        description="""
        Fetch and process market data:
        1. Get all supported markets using get_supported_markets
        2. For each market, fetch available assets using fetch_market_assets  
        3. Convert data to structured JSON format
        4. Identify assets with spread >= 1%
        
        Focus on efficient data processing and formatting.
        """,
        expected_output="Structured JSON report of markets and assets with high spreads",
        agent=market_researcher,
    )

    # Complex pricing analysis (70B task)  
    pricing_analysis_task = Task(
        description="""
        Perform advanced pricing analysis on high-spread opportunities:
        1. Calculate arbitrage potential for identified opportunities
        2. Analyze risk-adjusted returns using complex mathematical models
        3. Determine optimal position sizing and entry/exit strategies
        4. Evaluate multi-leg trading strategies
        
        Apply sophisticated quantitative analysis and strategic reasoning.
        """,
        expected_output="Detailed pricing analysis with recommended trading strategies",
        agent=pricing_specialist,
    )

    # Coordination task (7B task)
    coordination_task = Task(
        description="""
        Coordinate the analysis workflow:
        1. Review market data collection results
        2. Ensure pricing analysis covers all high-potential opportunities  
        3. Compile final strategic recommendations
        4. Manage task priorities and resource allocation
        
        Simple coordination and workflow management.
        """,
        expected_output="Executive summary of coordinated analysis results",
        agent=executive_coordinator,
    )

    # ===== CREW SETUP WITH OPTIMIZED EMBEDDINGS =====
    optimized_crew = Crew(
        # Use 7B model for embeddings to save tokens
        embedder=model_router.get_embedder_config(use_small_model=True),
        # Use 7B for planning coordination
        planning_llm=model_router.get_executive_llm("plan and coordinate crew tasks"),
        agents=[market_researcher, pricing_specialist, executive_coordinator],
        tasks=[market_data_task, pricing_analysis_task, coordination_task],
        verbose=True,
        process=Process.sequential,
        memory=False,  # Disable memory to avoid token overhead
        planning=True
    )

    # ===== EXECUTE WITH TOKEN OPTIMIZATION =====
    print("\n" + "="*80)
    print("🚀 STARTING OPTIMIZED MULTI-AGENT ANALYSIS")
    print("📊 Router automatically selecting optimal models for each task")
    print("="*80 + "\n")
    
    result = optimized_crew.kickoff()
    
    print("\n" + "="*80)
    print("✅ OPTIMIZED ANALYSIS COMPLETE")
    print("="*80)
    print(f"\nFinal Results:\n{result}")
    
    # Print routing statistics
    model_router.print_routing_stats()

except Exception as e:
    print(f"❌ Error in optimized analysis system: {e}")
    print("Ensure MarketAnalyzer is running on http://localhost:2000/mcp")
    print("Ensure Sei MCP server is running on http://localhost:3001/mcp")
    import traceback
    traceback.print_exc()

finally:
    if analyzer_adapter:
        pass

print("\n" + "="*60)
print("🤖 Token-Optimized Multi-Agent System Ready")
print("💰 Estimated 60-70% token savings vs all-70B approach")
print("="*60)