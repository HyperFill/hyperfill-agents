import axios from 'axios';
import * as math from 'mathjs';
import { create, all } from 'mathjs';
import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import { BlackScholes, Greeks } from 'blackscholes';
import { ActionType, OptionType } from './enums';

// Initialize math.js with complex number support
const mathjs = create(all);
mathjs.config({ number: 'BigNumber' });

// =====================
// DATA MODELS
// =====================
export interface MarketData {
    pair: string;
    price: number;
    volume: number;
    liquidity: number;
    spread: number;
    volatility: number;
    timestamp: Date;
    historicalPrices: number[];
    riskFreeRate?: number;
    dividendYield?: number;
}

export interface Opportunity {
    pair: string;
    action: ActionType;
    confidence: number;
    reason: string;
    timestamp: Date;
    expectedProfit?: number;
    riskScore?: number;
    aiAnalysis?: string;
    optionPrice?: number;
    greeks?: Greeks;
}

export interface OptionData {
    underlyingPrice: number;
    strikePrice: number;
    timeToExpiry: number; // in years
    riskFreeRate: number;
    volatility: number;
    optionType: OptionType;
    dividendYield?: number;
    optionPrice?: number;
    delta?: number;
    gamma?: number;
    theta?: number;
    vega?: number;
    rho?: number;
}

export interface TechnicalAnalysis {
    shortMomentum: number;
    longMomentum: number;
    rsi: number;
    volumeSurge: boolean;
    volumeTrend: number;
    volumeRatio: number;
}

// =====================
// FILAMENT API CLIENT
// =====================
export class FilamentAPIClient {
    private baseUrl: string;
    private rateLimit: number;
    private maxRetries: number;
    private retryDelay: number;
    private priceHistory: Record<string, number[]> = {};
    private seiAssets: Record<string, any> = {};

    constructor(baseUrl?: string) {
        this.baseUrl = baseUrl || process.env.FILAMENT_API_BASE_URL || 'https://api.filament.io';
        this.rateLimit = 100; // ms between requests
        this.maxRetries = 3;
        this.retryDelay = 1000; // ms
    }

    private async makeRequest(endpoint: string): Promise<any> {
        for (let attempt = 0; attempt < this.maxRetries; attempt++) {
            try {
                await new Promise(resolve => setTimeout(resolve, this.rateLimit));
                const response = await axios.get(`${this.baseUrl}${endpoint}`);
                return response.data;
            } catch (error) {
                if (error.response?.status === 429) {
                    const waitTime = this.retryDelay * Math.pow(2, attempt);
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                    continue;
                }
                throw error;
            }
        }
        throw new Error('Max retries exceeded');
    }

    async getSeiAssets(): Promise<any[]> {
        const endpoints = [
            '/filament/api/v1/assets',
            '/api/v1/assets',
            '/assets'
        ];

        for (const endpoint of endpoints) {
            try {
                const data = await this.makeRequest(endpoint);
                const seiAssets = Array.isArray(data) ?
                    data.filter(this.isSeiAsset) :
                    [data].filter(this.isSeiAsset);

                this.seiAssets = seiAssets.reduce((acc, asset) => {
                    const key = asset.symbol || asset.name || 'UNKNOWN';
                    acc[key] = asset;
                    return acc;
                }, {});

                return seiAssets;
            } catch (error) {
                continue;
            }
        }
        return [];
    }

    private isSeiAsset(asset: any): boolean {
        const seiIndicators = ['sei', 'SEI', 'Sei', '/sei', '/SEI', 'sei_', 'SEI_'];
        const assetStr = JSON.stringify(asset).toLowerCase();
        return seiIndicators.some(indicator => assetStr.includes(indicator.toLowerCase()));
    }

    calculateVolatility(prices: number[]): number {
        if (prices.length < 2) return 0.2;

        const returns = [];
        for (let i = 1; i < prices.length; i++) {
            returns.push(Math.log(prices[i] / prices[i - 1]));
        }

        const stdDev = mathjs.std(returns) as number;
        return Math.max(0.01, stdDev * Math.sqrt(252));
    }

    async getSeiMarketData(asset: string): Promise<MarketData> {
        const endpoints = [
            `/filament/api/v1/markets/${asset}`,
            `/api/v1/markets/${asset}`,
            `/markets/${asset}`,
            `/filament/api/v1/ticker/${asset}`,
            `/api/v1/ticker/${asset}`,
            `/ticker/${asset}`
        ];

        for (const endpoint of endpoints) {
            try {
                const data = await this.makeRequest(endpoint);
                return this.parseMarketData(asset, data);
            } catch (error) {
                continue;
            }
        }

        // Fallback to orderbook data
        return this.getOrderbookData(asset);
    }

    private parseMarketData(asset: string, data: any): MarketData {
        // Extract price from various possible fields
        const priceFields = ['price', 'last_price', 'close', 'current_price', 'bid', 'ask'];
        const price = this.extractNumericValue(data, priceFields) || 0;

        // Extract volume
        const volumeFields = ['volume', 'volume_24h', 'volume_usd', 'base_volume'];
        const volume = this.extractNumericValue(data, volumeFields) || 0;

        // Extract liquidity
        const liquidityFields = ['liquidity', 'market_cap', 'total_value_locked', 'tvl'];
        const liquidity = this.extractNumericValue(data, liquidityFields) || volume * price;

        // Calculate spread
        let spread = 0.001;
        if (data.bid && data.ask) {
            const bid = parseFloat(data.bid);
            const ask = parseFloat(data.ask);
            spread = bid > 0 ? (ask - bid) / bid : 0;
        } else if (data.spread) {
            spread = parseFloat(data.spread);
        }

        // Get historical prices
        const historicalPrices = (data.historical_prices || [])
            .map((p: any) => parseFloat(p))
            .filter((p: number) => !isNaN(p) && p > 0);

        const volatility = historicalPrices.length ?
            this.calculateVolatility(historicalPrices) : 0.2;

        return {
            pair: asset,
            price,
            volume,
            liquidity,
            spread,
            volatility,
            timestamp: new Date(),
            historicalPrices,
            riskFreeRate: 0.05,
            dividendYield: 0.0
        };
    }

    private extractNumericValue(data: any, fields: string[]): number | null {
        for (const field of fields) {
            if (data[field] !== undefined && data[field] !== null) {
                const value = parseFloat(data[field]);
                if (!isNaN(value)) return value;
            }
        }
        return null;
    }

    private async getOrderbookData(asset: string): Promise<MarketData> {
        const endpoints = [
            `/filament/api/v1/orderbook/${asset}`,
            `/api/v1/orderbook/${asset}`,
            `/orderbook/${asset}`
        ];

        for (const endpoint of endpoints) {
            try {
                const data = await this.makeRequest(endpoint);
                if (data.bids?.length && data.asks?.length) {
                    const bestBid = parseFloat(data.bids[0][0]);
                    const bestAsk = parseFloat(data.asks[0][0]);

                    if (bestBid > 0 && bestAsk > 0) {
                        const price = (bestBid + bestAsk) / 2;
                        const spread = (bestAsk - bestBid) / bestBid;

                        const bidVolume = data.bids.slice(0, 5).reduce(
                            (sum: number, bid: any) => sum + parseFloat(bid[1]), 0
                        );

                        const askVolume = data.asks.slice(0, 5).reduce(
                            (sum: number, ask: any) => sum + parseFloat(ask[1]), 0
                        );

                        const volume = bidVolume + askVolume;
                        const liquidity = volume * price;

                        return {
                            pair: asset,
                            price,
                            volume,
                            liquidity,
                            spread,
                            volatility: 0.2,
                            timestamp: new Date(),
                            historicalPrices: []
                        };
                    }
                }
            } catch (error) {
                continue;
            }
        }

        throw new Error(`Could not fetch data for ${asset}`);
    }
}

// =====================
// ADVANCED MARKET ANALYZER
// =====================
export class AdvancedMarketAnalyzer {
    private priceHistory: Record<string, number[]> = {};
    private volumeHistory: Record<string, number[]> = {};
    private minLiquidity = 10000;
    private openaiApiKey?: string;

    constructor(openaiApiKey?: string) {
        this.openaiApiKey = openaiApiKey || process.env.OPENAI_API_KEY;
    }

    async analyzeMomentum(marketData: MarketData): Promise<{
        shortMomentum: number;
        longMomentum: number;
        rsi: number;
    }> {
        const pair = marketData.pair;

        if (!this.priceHistory[pair]) {
            this.priceHistory[pair] = [];
        }

        this.priceHistory[pair].push(marketData.price);

        // Keep only last 50 data points
        if (this.priceHistory[pair].length > 50) {
            this.priceHistory[pair] = this.priceHistory[pair].slice(-50);
        }

        if (this.priceHistory[pair].length < 5) {
            return { shortMomentum: 0, longMomentum: 0, rsi: 50 };
        }

        const prices = this.priceHistory[pair];
        const shortMomentum = prices.length >= 3 ?
            (prices[prices.length - 1] - prices[prices.length - 3]) / prices[prices.length - 3] : 0;

        const lookback = Math.min(10, prices.length);
        const longMomentum = lookback > 1 ?
            (prices[prices.length - 1] - prices[prices.length - lookback]) / prices[prices.length - lookback] : 0;

        const rsi = this.calculateRSI(prices);

        return { shortMomentum, longMomentum, rsi };
    }

    private calculateRSI(prices: number[], period = 14): number {
        if (prices.length < period + 1) return 50;

        const deltas = [];
        for (let i = 1; i < prices.length; i++) {
            deltas.push(prices[i] - prices[i - 1]);
        }

        const gains = deltas.map(d => d > 0 ? d : 0);
        const losses = deltas.map(d => d < 0 ? -d : 0);

        const avgGain = gains.slice(-period).reduce((sum, g) => sum + g, 0) / period;
        const avgLoss = losses.slice(-period).reduce((sum, l) => sum + l, 0) / period;

        if (avgLoss === 0) return 100;
        const rs = avgGain / avgLoss;
        return 100 - (100 / (1 + rs));
    }

    async analyzeVolumePatterns(marketData: MarketData): Promise<{
        volumeSurge: boolean;
        volumeTrend: number;
        volumeRatio: number;
    }> {
        const pair = marketData.pair;

        if (!this.volumeHistory[pair]) {
            this.volumeHistory[pair] = [];
        }

        this.volumeHistory[pair].push(marketData.volume);

        // Keep only last 20 data points
        if (this.volumeHistory[pair].length > 20) {
            this.volumeHistory[pair] = this.volumeHistory[pair].slice(-20);
        }

        if (this.volumeHistory[pair].length < 5) {
            return { volumeSurge: false, volumeTrend: 0, volumeRatio: 1 };
        }

        const volumes = this.volumeHistory[pair];
        const currentVolume = volumes[volumes.length - 1];
        const recentAvg = volumes.slice(-5).reduce((sum, v) => sum + v, 0) / 5;
        const volumeSurge = currentVolume > recentAvg * 2;

        let volumeTrend = 0;
        if (volumes.length >= 10) {
            const recentShort = volumes.slice(-5).reduce((sum, v) => sum + v, 0) / 5;
            const recentLong = volumes.slice(-10, -5).reduce((sum, v) => sum + v, 0) / 5;
            volumeTrend = recentLong > 0 ? (recentShort - recentLong) / recentLong : 0;
        }

        const historicalAvg = volumes.reduce((sum, v) => sum + v, 0) / volumes.length;
        const volumeRatio = historicalAvg > 0 ? currentVolume / historicalAvg : 1;

        return { volumeSurge, volumeTrend, volumeRatio };
    }

    calculateOptionOpportunities(marketData: MarketData): OptionData[] {
        const opportunities: OptionData[] = [];
        const currentPrice = marketData.price;
        const strikeMultipliers = [0.9, 0.95, 1.0, 1.05, 1.1];
        const expirations = [7, 14, 30, 60, 90].map(days => days / 365);

        for (const multiplier of strikeMultipliers) {
            const strike = currentPrice * multiplier;

            for (const timeToExpiry of expirations) {
                for (const optionType of [OptionType.CALL, OptionType.PUT]) {
                    const optionPrice = BlackScholes.calculate(
                        currentPrice,
                        strike,
                        timeToExpiry,
                        marketData.volatility,
                        marketData.riskFreeRate || 0.05,
                        marketData.dividendYield || 0.0,
                        optionType
                    );

                    const greeks = BlackScholes.greeks(
                        currentPrice,
                        strike,
                        timeToExpiry,
                        marketData.volatility,
                        marketData.riskFreeRate || 0.05,
                        marketData.dividendYield || 0.0,
                        optionType
                    );

                    opportunities.push({
                        underlyingPrice: currentPrice,
                        strikePrice: strike,
                        timeToExpiry,
                        riskFreeRate: marketData.riskFreeRate || 0.05,
                        volatility: marketData.volatility,
                        optionType,
                        dividendYield: marketData.dividendYield || 0.0,
                        optionPrice,
                        delta: greeks.delta,
                        gamma: greeks.gamma,
                        theta: greeks.theta,
                        vega: greeks.vega,
                        rho: greeks.rho
                    });
                }
            }
        }

        return opportunities;
    }

    async getAIAnalysis(marketData: MarketData, technical: any, options: OptionData[]): Promise<string> {
        if (!this.openaiApiKey) return "AI analysis unavailable (no OpenAI API key)";

        try {
            const marketSummary = {
                pair: marketData.pair,
                price: marketData.price,
                volume: marketData.volume,
                volatility: marketData.volatility,
                liquidity: marketData.liquidity
            };

            const optionSummary = options.slice(0, 5).map(opt => ({
                type: opt.optionType,
                strike: opt.strikePrice,
                expiryDays: Math.round(opt.timeToExpiry * 365),
                price: opt.optionPrice,
                delta: opt.delta
            }));

            const response = await axios.post(
                'https://api.openai.com/v1/chat/completions',
                {
                    model: 'gpt-4-turbo',
                    messages: [{
                        role: 'system',
                        content: 'You are an expert quantitative analyst. Analyze the following market data and provide a comprehensive trading strategy.'
                    }, {
                        role: 'user',
                        content: JSON.stringify({
                            market_data: marketSummary,
                            technical_analysis: technical,
                            option_data: optionSummary
                        }, null, 2)
                    }],
                    temperature: 0.7,
                    max_tokens: 500
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.openaiApiKey}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            return response.data.choices[0].message.content;
        } catch (error) {
            console.error('AI analysis failed:', error);
            return `AI analysis error: ${error.message}`;
        }
    }

    filterLiquidity(marketData: MarketData): boolean {
        return marketData.liquidity >= this.minLiquidity;
    }

    validateMarketData(marketData: MarketData): boolean {
        return marketData &&
            marketData.price > 0 &&
            marketData.volume >= 0 &&
            marketData.volatility >= 0;
    }

    async detectOpportunity(marketData: MarketData): Promise<Opportunity | null> {
        if (!this.validateMarketData(marketData)) return null;
        if (!this.filterLiquidity(marketData)) return null;

        try {
            const momentum = await this.analyzeMomentum(marketData);
            const volume = await this.analyzeVolumePatterns(marketData);
            const options = this.calculateOptionOpportunities(marketData);

            let confidence = 0;
            let action = ActionType.HOLD;
            const reasons: string[] = [];

            // Momentum signals
            if (momentum.shortMomentum > 0.02 && momentum.longMomentum > 0.01) {
                action = ActionType.BUY;
                confidence += 0.4;
                reasons.push('strong upward momentum');
            } else if (momentum.shortMomentum < -0.02 && momentum.longMomentum < -0.01) {
                action = ActionType.SELL;
                confidence += 0.4;
                reasons.push('strong downward momentum');
            }

            // RSI signals
            if (momentum.rsi < 30) {
                if (action !== ActionType.SELL) action = ActionType.BUY;
                confidence += 0.3;
                reasons.push('oversold conditions');
            } else if (momentum.rsi > 70) {
                if (action !== ActionType.BUY) action = ActionType.SELL;
                confidence += 0.3;
                reasons.push('overbought conditions');
            }

            // Volume analysis
            if (volume.volumeSurge) {
                confidence += 0.2;
                reasons.push('volume surge');
            }

            if (volume.volumeTrend > 0.1) {
                confidence += 0.1;
                reasons.push('increasing volume trend');
            }

            // High volatility options opportunity
            if (marketData.volatility > 0.3 && options.length > 0) {
                const bestOption = options.reduce((best, opt) =>
                    Math.abs(opt.strikePrice - marketData.price) <
                        Math.abs(best.strikePrice - marketData.price) ? opt : best
                );

                if (Math.abs(bestOption.delta!) > 0.3) {
                    action = bestOption.delta! > 0 ? ActionType.BUY_CALL : ActionType.BUY_PUT;
                    confidence += 0.2;
                    reasons.push('high volatility options play');
                }
            }

            // Liquidity bonus
            if (marketData.liquidity > this.minLiquidity * 5) {
                confidence += 0.1;
                reasons.push('high liquidity');
            }

            if (confidence < 0.5) return null;

            // Get AI analysis
            const technicalAnalysis = { momentum, volume, volatility: marketData.volatility };
            const aiAnalysis = await this.getAIAnalysis(marketData, technicalAnalysis, options.slice(0, 3));

            // Calculate expected profit and risk
            const momentumValue = Math.max(
                Math.abs(momentum.shortMomentum),
                Math.abs(momentum.longMomentum)
            );
            const expectedProfit = momentumValue * confidence * 0.7;
            const riskScore = (1 - confidence) * (1 + marketData.volatility);

            // Find best option if applicable
            let optionPrice, greeks;
            if ([
                ActionType.BUY_CALL, ActionType.SELL_CALL,
                ActionType.BUY_PUT, ActionType.SELL_PUT
            ].includes(action)) {
                const relevantOptions = options.filter(opt =>
                    (action === ActionType.BUY_CALL || action === ActionType.SELL_CALL) ?
                        opt.optionType === OptionType.CALL :
                        opt.optionType === OptionType.PUT
                );

                if (relevantOptions.length > 0) {
                    const bestOption = relevantOptions.reduce((best, opt) =>
                        Math.abs(opt.strikePrice - marketData.price) <
                            Math.abs(best.strikePrice - marketData.price) ? opt : best
                    );

                    optionPrice = bestOption.optionPrice;
                    greeks = {
                        delta: bestOption.delta,
                        gamma: bestOption.gamma,
                        theta: bestOption.theta,
                        vega: bestOption.vega,
                        rho: bestOption.rho
                    };
                }
            }

            return {
                pair: marketData.pair,
                action,
                confidence: Math.min(confidence, 1),
                reason: reasons.join(' + '),
                timestamp: new Date(),
                expectedProfit,
                riskScore,
                aiAnalysis,
                optionPrice,
                greeks
            };
        } catch (error) {
            console.error('Opportunity detection failed:', error);
            return null;
        }
    }
}

// =====================
// MCP SERVER INTEGRATION
// =====================
export function registerAnalyzerWithMcp(server: McpServer, analyzer: AdvancedMarketAnalyzer, filament: FilamentAPIClient) {
    // Market data resource
    server.resource(
        'market_data',
        new ResourceTemplate('filament://market/{asset}', { asset: 'SEI' }),
        async (uri, params) => {
            const asset = params.asset as string;
            try {
                const marketData = await filament.getSeiMarketData(asset);
                return {
                    contents: [{
                        uri: uri.href,
                        text: JSON.stringify(marketData, null, 2)
                    }]
                };
            } catch (error) {
                return {
                    contents: [{
                        uri: uri.href,
                        text: `Error: ${error.message}`
                    }]
                };
            }
        }
    );

    // Opportunity detection tool
    server.tool(
        'detect_opportunity',
        'Detect trading opportunities based on market conditions',
        {
            asset: z.string().describe('Asset symbol to analyze'),
            min_confidence: z.number().optional().default(0.6)
        },
        async ({ asset, min_confidence }) => {
            try {
                const marketData = await filament.getSeiMarketData(asset);
                const opportunity = await analyzer.detectOpportunity(marketData);

                if (!opportunity || opportunity.confidence < min_confidence) {
                    return {
                        content: [{
                            type: 'text',
                            text: `No significant opportunity found for ${asset}`
                        }]
                    };
                }

                return {
                    content: [{
                        type: 'text',
                        text: JSON.stringify(opportunity, null, 2)
                    }]
                };
            } catch (error) {
                return {
                    content: [{
                        type: 'text',
                        text: `Analysis failed: ${error.message}`
                    }],
                    isError: true
                };
            }
        }
    );

    // AI analysis prompt
    server.prompt(
        'ai_market_analysis',
        'Get AI-powered market analysis and trading recommendations',
        {
            asset: z.string().describe('Asset symbol to analyze')
        },
        ({ asset }) => ({
            messages: [{
                role: 'user',
                content: {
                    type: 'text',
                    text: `Provide comprehensive analysis for ${asset} including:
          1. Technical assessment
          2. Fundamental positioning
          3. Trading strategy recommendations
          4. Risk management considerations`
                }
            }]
        })
    );
}

// =====================
// MAIN EXPORT
// =====================
export function createAnalyzerAgent(openaiApiKey?: string) {
    const filament = new FilamentAPIClient();
    const analyzer = new AdvancedMarketAnalyzer(openaiApiKey);
    return { filament, analyzer };
}