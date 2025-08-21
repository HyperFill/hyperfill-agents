from crewai import Agent, Task, Crew, Process, LLM
from crewai_tools import MCPServerAdapter
from core.utils import get_groq_key
import os

# Setup LLM
groq_key = get_groq_key()
print(groq_key, "GROQ_KEY")
os.environ["GROQ_API_KEY"] = get_groq_key()

llm = LLM(
    model="groq/llama-3.3-70b-versatile",
    temperature=0.7
)

# MCP Servers configuration (Analyzer + Sei MCP)
mcp_servers = [
    {"url": "http://localhost:2000/mcp", "transport": "streamable-http"},  # Market Analyzer Server
    {"url": "http://localhost:3001/mcp", "transport": "streamable-http"},  # Sei MCP Server
]

# Initialize MCP adapter
analyzer_adapter = None

try:
    # Initialize the MCP adapter aggregating both servers
    analyzer_adapter = MCPServerAdapter(mcp_servers)
    
    # Get tools from the adapter
    analyzer_tools = analyzer_adapter.tools
    
    print(f"Market Analyzer tools available: {[tool.name for tool in analyzer_tools]}")
    print("Expected Analyzer tools: get_supported_markets, fetch_market_assets, get_market_asset, get_asset_by_index_token")
    print("Expected Sei tools: get-token-info, get-token-balance, get-balance, get-transaction, read-contract, write-contract")

    # ===== MARKET RESEARCH AND ANALYSIS AGENT =====
    market_researcher = Agent(
        role="Senior Market Research and Analysis Specialist",
        goal="""Conduct comprehensive market research and analysis across all supported markets. 
        Identify trading opportunities, basically identify market with spread from 1 percent higher, analyze asset fundamentals, and provide detailed market insights 
        for informed decision-making.""",
        backstory="""You are an experienced market researcher with deep expertise in cryptocurrency markets, 
        asset analysis, and market structure. You specialize in identifying profitable trading opportunities 
        by analyzing market data, asset characteristics, and Spread in a particular market orderbook, to see where you can provide
        liquidiy and profit from spread, bid/ask. Your research forms the 
        foundation for trading strategies and investment decisions. You have extensive knowledge of technical 
        analysis, fundamental analysis, and quantitative methods for evaluating digital assets.""",
        tools=analyzer_tools,  # Market analysis tools only
        verbose=True,
        llm=llm,
        max_iter=5,
        memory=True

        
    )

    # ===== COMPREHENSIVE MARKET DISCOVERY TASK =====
    market_discovery_task = Task(
        description="""
        Perform comprehensive market discovery and analysis:
        
        1. Get all supported markets using get_supported_markets
        2. For each supported market, fetch all available assets using fetch_market_assets
        3. Analyze the asset landscape and identify key characteristics:
           - Total number of assets per market
           - Asset categories and types
           - the spread percentage bid/ask
           - Trading pair availability
        4. Create a comprehensive market overview report
        5. Identify markets with the most trading opportunities based on spread percentage
        
        Focus on understanding the complete market ecosystem available for analysis.
        """,
        expected_output="""
        A comprehensive market discovery report containing:
        - Complete list of supported markets
        - Asset count and breakdown per market
        - One asset with the highest spread percentage
        """,
        agent=market_researcher,
    )

    # ===== CREW SETUP =====
    # market_analysis_crew = Crew(
    #     agents=[market_researcher],
    #     tasks=[
    #         market_discovery_task
    #     ],
    #     verbose=True,
    #     process=Process.sequential,  # Execute tasks in logical order
    #     memory=True,
    #     planning=True  # Enable planning for better analysis flow
    # )


    embedder = {
    "provider": "groq",
        "config": {
            "model": "groq/llama-3.3-70b-versatile",
            "api_key": groq_key
        }
    }

    market_analysis_crew = Crew(
        embedder=embedder,
        planning_llm=llm,
        agents=[market_researcher],
        tasks=[market_discovery_task],
        verbose=True,
        process=Process.sequential,
        memory=False,        # <- disable memory to avoid OpenAI-based embeddings
        llm=llm,             # <- set the Crew's default LLM to your GROQ LLM
        planning=True
    )

    # ===== EXECUTE MARKET ANALYSIS =====
    print("\n" + "="*80)
    print("🔍 STARTING COMPREHENSIVE MARKET ANALYSIS")
    print("="*80 + "\n")
    
    result = market_analysis_crew.kickoff()
    
    print("\n" + "="*80)
    print("📊 MARKET ANALYSIS COMPLETE")
    print("="*80)
    print(f"\nFinal Strategic Intelligence Report:\n{result}")

except Exception as e:
    print(f"❌ Error in market analysis system: {e}")
    print("Ensure MarketAnalyzer is on http://localhost:2000/mcp and Sei MCP server on http://localhost:3001/mcp")
    import traceback
    traceback.print_exc()
finally:
    # Clean up adapter if needed
    if analyzer_adapter:
        # Clean up the adapter if needed
        pass

print("\n" + "="*50)
print("Market Analysis Client Ready for Automation")
print("="*50)