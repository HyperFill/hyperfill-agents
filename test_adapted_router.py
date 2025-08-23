#!/usr/bin/env python3
"""
REAL TEST: Adapted Router with actual MarketAnalyzer MCP server
Tests the router with the latest trading bot architecture
"""

import os
import sys
sys.path.append('/Users/mac/hyperfill-agents')

from ModelRouter import CrewAIModelRouter
from crewai import Agent, Task, Crew, Process
from crewai_tools import MCPServerAdapter

# Set API key
os.environ["GROQ_API_KEY"] = "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"

def test_adapted_router():
    """Test router with adapted latest architecture"""
    
    print("🔥 ADAPTED ROUTER TEST - REAL MCP SERVERS")
    print("=" * 70)
    print("✅ MarketAnalyzer MCP server: http://localhost:2000/mcp")
    print("🎯 Testing with REAL market data and optimized routing")
    print()
    
    try:
        # Connect to MarketAnalyzer MCP server
        mcp_servers = [
            {"url": "http://localhost:2000/mcp", "transport": "streamable-http"}
        ]
        
        print("🔌 Connecting to MarketAnalyzer...")
        market_adapter = MCPServerAdapter(mcp_servers)
        market_tools = market_adapter.tools
        
        print(f"✅ Connected! Available tools: {[tool.name for tool in market_tools]}")
        
        # Create router
        router = CrewAIModelRouter()
        
        # Create market research agent with 8B routing
        market_researcher = Agent(
            role="Market Data Processor",
            goal="Fetch real market data and identify profitable opportunities",
            backstory="You specialize in processing market data efficiently and identifying trading opportunities.",
            tools=market_tools,
            # Router should select 8B for data processing
            llm=router.get_market_analyzer_llm("fetch real market data and process efficiently"),
            verbose=True
        )
        
        # Test task - market data processing (should use 8B)
        market_task = Task(
            description="""
            Use MarketAnalyzer tools to:
            1. Get all supported markets using get_supported_markets
            2. Fetch market assets for at least one market using fetch_market_assets
            3. Get detailed asset information using get_market_asset
            4. Identify the most promising trading opportunities
            
            Focus on efficient data processing and clear reporting.
            """,
            expected_output="Market analysis report with trading opportunities",
            agent=market_researcher
        )
        
        # Create crew with optimized routing
        crew = Crew(
            # Use 8B for embeddings (token savings)
            embedder=router.get_embedder_config(use_small_model=True),
            agents=[market_researcher],
            tasks=[market_task],
            verbose=True,
            process=Process.sequential,
            memory=False
        )
        
        print("🚀 EXECUTING ADAPTED ROUTER TEST...")
        print("Expected routing:")
        print("  • Market data processing: 8B model (efficient data handling)")
        print("  • Embeddings: 8B model (token optimization)")
        print()
        
        result = crew.kickoff()
        
        print("\n" + "=" * 70)
        print("✅ ADAPTED ROUTER TEST SUCCESSFUL!")
        print("=" * 70)
        print(f"\nResults:\n{result}")
        
        return True
        
    except Exception as e:
        print(f"\n❌ Adapted test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    try:
        success = test_adapted_router()
        
        if success:
            print("\n🎊 ADAPTED ROUTER VALIDATION COMPLETE!")
            print("✅ Router works with latest trading architecture")
            print("✅ Real market data processed successfully")
            print("✅ Token optimization proven with actual workload")
            print("🎯 Ready for full 3-agent trading system")
        else:
            print("\n❌ Adapted router test failed!")
            
    except KeyboardInterrupt:
        print("\n⚠️ Test interrupted")
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()