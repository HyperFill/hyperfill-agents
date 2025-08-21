from crewai import Agent, Task, Crew, Process, LLM
from crewai_tools import MCPServerAdapter
from core.utils import get_groq_key
import os

# Setup LLM
groq_key = get_groq_key()
print(groq_key, "GROQ_KEY")
os.environ["GROQ_API_KEY"] = get_groq_key()

max_response_tokens = 512
llm = LLM(
    model="groq/llama-3.3-70b-versatile",
    temperature=0.7,
    max_tokens=max_response_tokens
)

# Market Analyzer MCP Server configuration
servers = [
    {"url": "http://localhost:2000/mcp", "transport": "streamable-http"} , # Market Analyzer Server
    {"url": "http://localhost:3000/mcp", "transport": "streamable-http"} , # Market Analyzer Server

]

# Initialize MCP adapter
analyzer_adapter = None
pricer_adapter = None


try:
    # Initialize the market analyzer adapter
    analyzer_adapter = MCPServerAdapter(servers)
    pricer_adapter = MCPServerAdapter(servers[1])

    
    # Get tools from the adapter
    analyzer_tools = analyzer_adapter.tools
    pricer_tools = pricer_adapter.tools

    
    print(f"Market Analyzer tools available: {[tool.name for tool in analyzer_tools]}")
    print("Expected tools: get_supported_markets, fetch_market_assets, get_market_asset, get_asset_by_index_token")

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
        verbose=False,
        llm=llm,
        max_iter=4,
        # memory=True    
    )

    Pricer = Agent(
        role="Senior Market Price Strategist",
        goal="""
                Ascertain the Amount in Hyper fill vault, 
                randomly decide based on amont in vault what order size to use for the buy and sell side of the market order,
                query the proper mid price based on bid and ask price of the particular pair in question
            """,
        backstory="""You are a Senior Market Price Strategist with deep experience in crypto markets and market-making.
        You analyze orderbooks, bid/ask spreads,
            and pool reserves to compute reliable mid-prices,
            then size buy and sell orders based on the vault balance and measured liquidity.
            You prioritize safe execution, balanced inventory, 
            and profitable spread capture while observing risk limits and market impact.""",
        tools=pricer_tools,  # Market analysis tools only
        verbose=False,
        llm=llm,
        max_iter=4,
        # memory=True
        
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

    pricing_task = Task(
        description="""
        based on current bid and ask Set the set the bid and ask price at around a profitable percentage from mid price or asset pair:
        
        1. Get the Balance of the Vault and the underlying asset which should be SEI
        2. Randomly decide based on amount in vault what order size to put in
        3. Ascertain the proper mid price for that pair
        4. Properly set the starting bid and ask price spread gap percentage
        5. This is a spread strategy we want to get the best prices possible for profitability also with frequent trades
        
        Focus on understanding spread strategy and setting the best price possible.
        """,
        expected_output="""
        A comprehensive report containing:
        - order size
        - the pair to enter
        - The spread percentage for the entry this is meant for the executive agent to execute
        - the current balance in vault
        """,
        agent=Pricer,
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


    # embedder = {
    # "provider": "groq",
    #     "config": {
    #         "model": "groq/llama-3.3-70b-versatile",
    #         "api_key": groq_key
    #     }
    # }

    market_analysis_crew = Crew(
        # embedder=embedder,
        # planning_llm=llm,
        agents=[market_researcher, Pricer],
        tasks=[market_discovery_task, pricing_task],
        verbose=False,
        process=Process.sequential,
        memory=False,
        llm=llm,             
        # planning=True
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
    print("Ensure the Market Analyzer MCP server is running on localhost:1000")
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