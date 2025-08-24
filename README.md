# Sei HyperFill Agents

```
██╗  ██╗██╗   ██╗██████╗ ███████╗██████╗ ███████╗██╗██╗     ██╗     
██║  ██║╚██╗ ██╔╝██╔══██╗██╔════╝██╔══██╗██╔════╝██║██║     ██║     
███████║ ╚████╔╝ ██████╔╝█████╗  ██████╔╝█████╗  ██║██║     ██║     
██╔══██║  ╚██╔╝  ██╔═══╝ ██╔══╝  ██╔══██╗██╔══╝  ██║██║     ██║     
██║  ██║   ██║   ██║     ███████╗██║  ██║██║     ██║███████╗███████╗
╚═╝  ╚═╝   ╚═╝   ╚═╝     ╚══════╝╚═╝  ╚═╝╚═╝     ╚═╝╚══════╝╚══════╝

          First AI Market Making Vault on SEI Network 
              "We make money while you sleep" - The HyperFill Team
```


## TL,DR
For the SEI AI Hackathon, we've built an multi agent system for automated DeFi trading and market making operations called the HyperFill protocol. The system coordinates specialized agents to analyze markets and execute trades based on financial strategies.

## Architecture

```
hyperfill-agents/
├── Client/              # Orchestration layer (Python/CrewAI)
├── Executive/           # Strategy coordination agent
├── MarketAnalyzer/      # Market data analysis agent  
├── Pricer/              # Price calculation agent
├── ModelRouter/         # LLM routing optimization
└── external/            # External integrations
```

## Agents

### Client (Python/CrewAI)
**Language:** Python  
**Framework:** CrewAI  

Main orchestration system that coordinates all agents using CrewAI framework. Connects to multiple MCP servers and performs market discovery.

**Core Features:**
- Multi-agent coordination with CrewAI
- MCP server aggregation
- Market discovery and analysis
- Spread identification (targets >1% spreads)
- GROQ LLM integration

**Dependencies:**
```python
crewai-tools[mcp]>=0.60.0
crewai[tools]>=0.157.0
python-dotenv>=1.1.1
```

### Executive (TypeScript/MCP)
**Port:** 1000  
**Language:** TypeScript  
**Framework:** Express + MCP SDK  

Strategy coordination agent responsible for high-level decision making and task delegation across the agent ecosystem.

**Core Features:**
- Strategic decision coordination
- Agent task delegation
- HyperFill protocol integration
- Market making bot coordination

**Key Components:**
- `HyperFillClient.ts` - Protocol API client
- `market-maker-bot.ts` - Automated trading strategies
- `MCPSSEClient.ts` - Secure client communications

### MarketAnalyzer (TypeScript/MCP)
**Port:** 2000  
**Language:** TypeScript  
**Framework:** Express + MCP SDK  

Data analysis and opportunity identification agent.

**Features:**
- Market data aggregation
- Asset analysis and categorization
- Spread calculation and monitoring
- Trading opportunity identification

**Services:**
- `market-manager.ts` - Market data coordination
- `hyper-fillmm-client.ts` - Market maker client integration

### Pricer (TypeScript/MCP)
**Port:** 3000  
**Language:** TypeScript  
**Framework:** Express + MCP SDK  

Pricing engine for calculating optimal trade prices and arbitrage opportunities.

**Features:**
- Calculation
- Oracle integration
- Arbitrage opportunity detection
- Risk pricing models

**Components:**
- `price-oracle-client.ts` - External price feeds
- `oracle-test.ts` - Oracle validation
- Smart contract ABI integration

## ModelRouter (Python)
**Language:** Python  
**Purpose:** LLM optimization  

Intelligent routing system that selects optimal model sizes based on task complexity to reduce token usage while maintaining performance.

**Features:**
- Task complexity classification
- Dynamic model selection (8B vs 70B)
- Token usage optimization
- Agent-specific routing rules

**Model Options:**
- `SMALL`: `groq/llama-3.1-8b-instant`
- `LARGE`: `groq/llama-3.3-70b-versatile`

## Communication Protocol

All agents implement the Model Context Protocol (MCP) for inter agent communication:

- **Executive:** `http://localhost:1000/mcp`
- **MarketAnalyzer:** `http://localhost:2000/mcp`  
- **Pricer:** `http://localhost:3000/mcp`

## Quick Start

### Prerequisites
```bash
# Node.js dependencies
npm install

# Python dependencies  
pip install crewai-tools[mcp] crewai[tools] python-dotenv
```

### Environment Setup
```bash
# Required environment variables
GROQ_API_KEY=your_groq_key
HYPERFILL_PRIVATE_KEY=your_private_key
HYPERFILL_ACCOUNT=your_account_address
MARKET_BASE_URL=http://localhost:8000
```

### Running the System

1. **Start MCP Servers**
```bash
# Terminal 1 - Executive
cd Executive && npm run dev

# Terminal 2 - MarketAnalyzer  
cd MarketAnalyzer && npm run dev

# Terminal 3 - Pricer
cd Pricer && npm run dev
```

2. **Launch Client Orchestrator**
```bash
cd Client && python main.py
```

## Agent Capabilities

| Agent          | Market Analysis | Trade Execution | Price Calculation | Strategy Coordination |
|----------------|----------------|-----------------|------------------|----------------------|
| **Executive**      | ❌             | ✅              | ❌               | ✅                   |
| **MarketAnalyzer** | ✅             | ❌              | ❌               | ❌                   |
| **Pricer**         | ❌             | ❌              | ✅               | ❌                   |
| **Client**         | ✅             | ❌              | ❌               | ✅                   |


## Performance Optimization

The ModelRouter provides intelligent LLM selection:
- **8B Model:** Simple tasks (data fetching, formatting)
- **70B Model:** Complex analysis (pricing strategies, arbitrage calculations)
- **Estimated Savings:** 70% token reduction for appropriate tasks

## Integration Points

- **HyperFill Protocol:** Direct API integration for order placement and market data
- **Sei Blockchain:** External MCP server for on-chain interactions
- **GROQ LLMs:** High-performance language model inference
- **CrewAI Framework:** Multi-agent orchestration and coordination
