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

# MCP Server configuration
# sei
server_params_list = [
    {"url": "http://localhost:1000/mcp", "transport": "streamable-http"}, # Trade Analyzing
    {"url": "http://localhost:2000/mcp", "transport": "streamable-http"}, # Executive mcp server

    {"url": "http://localhost:3001/mcp", "transport": "streamable-http"}, # Sei mcp server
    {"url": "http://localhost:4000/mcp", "transport": "streamable-http"}, # inventory mcp server


]

mcp_server_adapter = None
try:
    mcp_server_adapter = MCPServerAdapter(server_params_list)
    tools = mcp_server_adapter.tools
    print(f"Available tools: {[tool.name for tool in tools]}")

    # ===== AGENT 1: CRYPTO TRADE ANALYZER AND PRICING AGENT =====
    crypto_analyzer = Agent(
        role="Senior Crypto Trade Analyzer and Pricing Specialist",
        goal="""Analyze current market conditions, price movements, and chart patterns for SEI network assets. 
        Determine optimal entry prices, risk levels, and trading opportunities using technical analysis and market data.""",
        backstory="""You are a seasoned cryptocurrency analyst with deep expertise in technical analysis, 
        market microstructure, and quantitative trading strategies. You specialize in analyzing crypto markets 
        on the SEI network, interpreting price action, volume patterns, and market sentiment. You use advanced 
        tools including Black-Scholes analysis for options strategies and synthetic positions. Your analysis 
        forms the foundation for all trading decisions.""",
        tools=tools,
        verbose=True,
        llm=llm,
        max_iter=3,
        memory=True
    )

    # ===== AGENT 2: EXECUTIVE TRADING AGENT =====
    executive_trader = Agent(
        role="Executive Trading Agent",
        goal="""Execute trades based on analysis from the pricing agent. Place orders, manage positions, 
        set stop-losses and take-profits, and handle risk management. Ensure all trades are executed 
        efficiently and according to the trading strategy.""",
        backstory="""You are a professional trade execution specialist with expertise in order management, 
        position sizing, and risk control. You work closely with analysts to execute their trading ideas 
        with precision timing and optimal order placement. You understand market microstructure, slippage 
        management, and various order types. You never execute trades without proper analysis and always 
        implement appropriate risk management measures.""",
        tools=tools,
        verbose=True,
        llm=llm,
        max_iter=3,
        memory=True
    )

    # ===== AGENT 3: INVENTORY AND PORTFOLIO TRACKING AGENT =====
    inventory_tracker = Agent(
        role="Portfolio Inventory and Risk Manager",
        goal="""Track account balances, monitor all open positions, analyze portfolio performance, 
        and maintain comprehensive records of trading history. Provide real-time portfolio analytics 
        and risk assessment.""",
        backstory="""You are a meticulous portfolio manager and risk analyst responsible for maintaining 
        accurate records of all trading activities. You monitor account balances, track P&L across all 
        positions, analyze trading performance metrics, and ensure compliance with risk management rules. 
        You provide critical insights about portfolio health, diversification, and exposure management 
        to support informed trading decisions.""",
        tools=tools,
        verbose=True,
        llm=llm,
        max_iter=3,
        memory=True
    )

    # ===== TRADING ANALYSIS TASK =====
    market_analysis_task = Task(
        description="""
        Perform comprehensive market analysis for SEI network crypto assets:
        
        1. Fetch all available assets and analyze current market conditions
        2. Identify the most liquid and volatile assets suitable for trading
        3. Analyze price movements, trends, and technical indicators
        4. Use Black-Scholes analysis to evaluate synthetic options strategies if applicable
        5. Determine optimal entry points, stop-loss levels, and take-profit targets
        6. Assess market volatility and recommend position sizing
        7. Provide specific trading recommendations with risk/reward ratios
        
        Focus on assets with good liquidity and clear technical setups.
        """,
        expected_output="""
        A detailed market analysis report containing:
        - List of recommended assets for trading
        - Technical analysis with entry/exit points
        - Risk assessment and position sizing recommendations  
        - Specific price targets and stop-loss levels
        - Market condition assessment (bullish/bearish/neutral)
        - Volatility analysis and implied volatility insights
        """,
        agent=crypto_analyzer,
    )

    # ===== TRADE EXECUTION TASK =====
    trade_execution_task = Task(
        description="""
        Based on the market analysis, execute the recommended trades:
        
        1. Review the analysis and trading recommendations
        2. Check current account balance and available margin
        3. Verify that recommended assets are available for trading
        4. Place appropriate orders (market or limit) based on the analysis
        5. Set stop-loss and take-profit orders as recommended
        6. Confirm successful order placement and provide order IDs
        7. Monitor initial trade execution and report any issues
        
        Do not execute trades without proper analysis from the analyzer agent.
        Ensure all risk management measures are in place before placing orders.
        """,
        expected_output="""
        A trade execution report containing:
        - Summary of orders placed with order IDs
        - Confirmation of stop-loss and take-profit levels set
        - Position details and entry prices achieved
        - Any execution issues or slippage encountered
        - Current portfolio impact of new positions
        """,
        agent=executive_trader,
    )

    # ===== INVENTORY TRACKING TASK =====
    inventory_tracking_task = Task(
        description="""
        Monitor and report on current portfolio status:
        
        1. Check current account balance and available funds
        2. Fetch and analyze all open positions
        3. Review recent trading history and performance
        4. Calculate unrealized and realized P&L
        5. Assess portfolio diversification and risk exposure
        6. Monitor margin usage and available leverage
        7. Identify any positions that may need attention
        8. Provide portfolio health assessment
        
        Maintain comprehensive records and highlight any risk concerns.
        """,
        expected_output="""
        A comprehensive portfolio report containing:
        - Current account balance and available funds
        - Detailed list of all open positions with P&L
        - Portfolio diversification analysis
        - Risk metrics and margin utilization
        - Recent trading performance summary
        - Recommendations for portfolio optimization
        - Any positions requiring immediate attention
        """,
        agent=inventory_tracker,
    )

    # ===== COMPLETE TRADING STRATEGY TASK =====
    strategy_coordination_task = Task(
        description="""
        Coordinate a complete trading strategy cycle:
        
        1. Ensure market analysis is comprehensive and actionable
        2. Verify trade execution aligns with analysis recommendations
        3. Confirm portfolio tracking captures all changes accurately
        4. Identify any discrepancies between analysis, execution, and tracking
        5. Provide overall assessment of trading strategy effectiveness
        6. Recommend adjustments for future trading cycles
        
        This task ensures all three agents work together cohesively.
        """,
        expected_output="""
        A strategy coordination summary containing:
        - Verification that analysis was properly executed
        - Confirmation of accurate portfolio tracking
        - Assessment of strategy effectiveness
        - Recommendations for improvement
        - Next steps for ongoing trading operations
        """,
        agent=crypto_analyzer,  # Lead agent for coordination
    )

    # ===== CREW SETUP =====
    trading_crew = Crew(
        agents=[crypto_analyzer, executive_trader, inventory_tracker],
        tasks=[
            market_analysis_task,
            inventory_tracking_task,  # Check portfolio first
            trade_execution_task,
            strategy_coordination_task
        ],
        verbose=True,
        process=Process.sequential,  # Execute tasks in order
        memory=True,
        planning=True  # Enable planning for better coordination
    )

    # ===== EXECUTE TRADING CYCLE =====
    print("\n" + "="*80)
    print("🚀 STARTING COMPREHENSIVE TRADING CYCLE")
    print("="*80 + "\n")
    
    result = trading_crew.kickoff()
    
    print("\n" + "="*80)
    print("📊 TRADING CYCLE COMPLETE")
    print("="*80)
    print(f"\nFinal Result:\n{result}")

except Exception as e:
    print(f"❌ Error in trading system: {e}")
    print("Ensure the MCP server is running and all tools are available.")
finally:
    if mcp_server_adapter:
        # Clean up the adapter if needed
        pass