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

# MCP Server configuration
servers = [
    {"url": "http://localhost:2000/mcp", "transport": "streamable-http"}, # Market Analyzer Server
    {"url": "http://localhost:3000/mcp", "transport": "streamable-http"}, # Pricer Server  
    {"url": "http://localhost:4000/mcp", "transport": "streamable-http"}  # Executive Server
]

# Initialize MCP adapters
analyzer_adapter = None
pricer_adapter = None
executive_adapter = None

try:
    # Initialize the adapters
    analyzer_adapter = MCPServerAdapter([servers[0]])
    pricer_adapter = MCPServerAdapter([servers[1]]) 
    executive_adapter = MCPServerAdapter([servers[2]])

    # Get tools from the adapters
    analyzer_tools = analyzer_adapter.tools
    pricer_tools = pricer_adapter.tools
    executive_tools = executive_adapter.tools

    print(f"Market Analyzer tools available: {[tool.name for tool in analyzer_tools]}")
    print(f"Pricer tools available: {[tool.name for tool in pricer_tools]}")
    print(f"Executive tools available: {[tool.name for tool in executive_tools]}")

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
        tools=analyzer_tools,
        verbose=False,
        llm=llm,
        max_iter=4,
    )

    # ===== PRICING STRATEGIST AGENT =====
    pricer = Agent(
        role="Senior Market Price Strategist",
        goal="""
                Ascertain the Amount in Hyper fill vault, 
                randomly decide based on amount in vault what order size to use for the buy and sell side of the market order,
                query the proper mid price based on bid and ask price of the particular pair in question
            """,
        backstory="""You are a Senior Market Price Strategist with deep experience in crypto markets and market-making.
        You analyze orderbooks, bid/ask spreads,
            and pool reserves to compute reliable mid-prices,
            then size buy and sell orders based on the vault balance and measured liquidity.
            You prioritize safe execution, balanced inventory, 
            and profitable spread capture while observing risk limits and market impact.""",
        tools=pricer_tools,
        verbose=False,
        llm=llm,
        max_iter=4,
    )

    # ===== EXECUTIVE TRADING AGENT =====
    executive_trader = Agent(
        role="Executive Trading Operations Manager",
        goal="""Execute market making operations based on research and pricing analysis. 
        Manage vault assets, deploy trading bots, and oversee the complete trading workflow 
        from asset allocation to active market making.""",
        backstory="""You are a seasoned Executive Trading Operations Manager with expertise in 
        automated trading systems and risk management. You translate market research and pricing 
        strategies into actionable trading operations. You have deep knowledge of DeFi protocols, 
        smart contract interactions, and automated market making systems. Your role is to execute 
        the strategic decisions made by the research and pricing teams, ensuring proper asset 
        management, bot deployment, and continuous monitoring of trading operations. You prioritize 
        capital efficiency, risk management, and operational excellence.""",
        tools=executive_tools,
        verbose=False,
        llm=llm,
        max_iter=6,
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

    # ===== PRICING STRATEGY TASK =====
    pricing_task = Task(
        description="""
        Based on current bid and ask, set the bid and ask price at around a profitable percentage from mid price for asset pair:
        
        1. Get the Balance of the Vault and the underlying asset which should be SEI
        2. Randomly decide based on amount in vault what order size to put in
        3. Ascertain the proper mid price for that pair
        4. Properly set the starting bid and ask price spread gap percentage
        5. This is a spread strategy we want to get the best prices possible for profitability also with frequent trades
        
        Focus on understanding spread strategy and setting the best price possible.
        """,
        expected_output="""
        A comprehensive pricing strategy report containing:
        - Recommended order size based on vault balance
        - The specific trading pair to enter
        - The optimal spread percentage for market entry
        - Current vault balance details
        - Calculated mid price and recommended bid/ask prices
        """,
        agent=pricer,
    )

    # ===== EXECUTIVE TRADING TASK =====
    executive_trading_task = Task(
        description="""
        Execute the complete market making workflow based on the research and pricing analysis from previous tasks:
        
        1. Review the market research findings and selected trading pair
        2. Validate the pricing strategy and order sizing recommendations
        3. Check current vault balance and ensure sufficient funds
        4. Move required assets from vault to trading wallet if needed
        5. Deploy the market maker bot with the recommended configuration:
           - Use the identified trading pair from research
           - Apply the calculated order size from pricing analysis
           - Set the optimal spread percentage
           - Configure the reference price based on mid-price analysis
        6. Monitor initial bot deployment and ensure proper operation
        7. Provide comprehensive execution report
        
        Execute the full workflow using the start_market_making_workflow tool or individual tools as needed.
        Ensure all operations are executed safely with proper error handling.
        """,
        expected_output="""
        A comprehensive execution report containing:
        - Confirmation of vault asset movement
        - Market maker bot deployment status
        - Active trading pair and configuration details
        - Initial order placement confirmation
        - Risk management checks completed
        - Next steps for monitoring and optimization
        """,
        agent=executive_trader,
        context=[market_discovery_task, pricing_task]  # Access to previous task outputs
    )

    # ===== CREW SETUP =====
    market_analysis_crew = Crew(
        agents=[market_researcher, pricer, executive_trader],
        tasks=[market_discovery_task, pricing_task, executive_trading_task],
        verbose=False,
        process=Process.sequential,
        memory=False,
        llm=llm,             
    )

    # ===== EXECUTE COMPLETE MARKET MAKING WORKFLOW =====
    print("\n" + "="*80)
    print("STARTING COMPREHENSIVE MARKET MAKING WORKFLOW")
    print("="*80 + "\n")
    
    result = market_analysis_crew.kickoff()
    
    print("\n" + "="*80)
    print("MARKET MAKING WORKFLOW COMPLETE")
    print("="*80)
    print(f"\nFinal Execution Report:\n{result}")

except Exception as e:
    print(f"Error in market making system: {e}")
    print("Ensure all MCP servers are running:")
    print("- Market Analyzer: localhost:2000")
    print("- Pricer: localhost:3000") 
    print("- Executive: localhost:4000")
    import traceback
    traceback.print_exc()
finally:
    # Clean up adapters if needed
    if analyzer_adapter:
        pass
    if pricer_adapter:
        pass
    if executive_adapter:
        pass

print("\n" + "="*50)
print("Market Making System Ready for Automation")
print("="*50)