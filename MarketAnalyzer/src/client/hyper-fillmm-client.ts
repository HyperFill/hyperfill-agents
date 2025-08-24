// Types and Interfaces
export interface OrderPayload {
  account: string;
  baseAsset: string;
  quoteAsset: string;
  price: string;
  quantity: string;
  side: 'bid' | 'ask';
  privateKey: string;
  type: 'limit' | 'market';
}

export interface CancelOrderPayload {
  orderId: string;
  side: 'bid' | 'ask';
  baseAsset: string;
  quoteAsset: string;
}

export interface OrderBookRequest {
  symbol: string;
}

export interface BestOrderRequest {
  baseAsset: string;
  quoteAsset: string;
  side: 'bid' | 'ask';
}

export interface AvailableFundsRequest {
  account: string;
  asset: string;
}

export interface OrderStatusRequest {
  orderId: string;
}

export interface Trade {
  timestamp: number;
  price: number;
  quantity: number;
  time: number;
  party1: [string, string, number | null, number | null, string];
  party2: [string, string, number | null, number | null, string];
}

export interface OrderResponse {
  orderId: number;
  account: string;
  price: number;
  quantity: number;
  side: string;
  baseAsset: string;
  quoteAsset: string;
  trade_id: string;
  trades: Trade[];
  isValid: boolean;
  timestamp: number;
}

export interface ApiResponse<T = any> {
  message: string;
  status_code: number;
  order?: OrderResponse;
  nextBest?: OrderResponse;
  taskId?: string;
  validation_details?: any;
  settlement_info?: any;
  orderbook?: any;
  lockedAmount?: number;
  data?: T;
}

export interface SettlementHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  message: string;
  web3_connected: boolean;
  contract_address?: string;
}

export interface HyperFillConfig {
  baseUrl?: string;
  account: string;
  privateKey: string;
}

export class HyperFillMMClient {
  private baseUrl: string;
  private account: string;
  private privateKey: string;

  constructor(config: HyperFillConfig) {
    this.baseUrl = config.baseUrl || "http://localhost:8000";
    this.account = config.account.toLowerCase();
    this.privateKey = config.privateKey;
  }

  // Helper method to make API calls
  private async makeApiCall<T = any>(endpoint: string, payload: any): Promise<ApiResponse<T>> {
    const formData = new FormData();
    formData.append('payload', JSON.stringify(payload));

    const response = await fetch(`${this.baseUrl}/api/${endpoint}`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`API call failed: ${errorData.detail || response.statusText}`);
    }

    return await response.json();
  }

  // Order placement functions
  async placeLimitOrder(
    baseAsset: string,
    quoteAsset: string,
    side: 'bid' | 'ask',
    price: string,
    quantity: string
  ): Promise<ApiResponse> {
    const payload: OrderPayload = {
      account: this.account,
      baseAsset,
      quoteAsset,
      price,
      quantity,
      side,
      privateKey: this.privateKey,
      type: 'limit'
    };

    return this.makeApiCall('register_order', payload);
  }

  async placeMarketOrder(
    baseAsset: string,
    quoteAsset: string,
    side: 'bid' | 'ask',
    quantity: string
  ): Promise<ApiResponse> {
    const payload: OrderPayload = {
      account: this.account,
      baseAsset,
      quoteAsset,
      price: '0', // Price is ignored for market orders
      quantity,
      side,
      privateKey: this.privateKey,
      type: 'market'
    };

    return this.makeApiCall('register_order', payload);
  }

  // Convenience methods for buy/sell - both limit and market
  async placeBuyLimitOrder(
    baseAsset: string,
    quoteAsset: string,
    price: string,
    quantity: string
  ): Promise<ApiResponse> {
    return this.placeLimitOrder(baseAsset, quoteAsset, 'bid', price, quantity);
  }

  async placeSellLimitOrder(
    baseAsset: string,
    quoteAsset: string,
    price: string,
    quantity: string
  ): Promise<ApiResponse> {
    return this.placeLimitOrder(baseAsset, quoteAsset, 'ask', price, quantity);
  }

  async placeBuyMarketOrder(
    baseAsset: string,
    quoteAsset: string,
    quantity: string
  ): Promise<ApiResponse> {
    return this.placeMarketOrder(baseAsset, quoteAsset, 'bid', quantity);
  }

  async placeSellMarketOrder(
    baseAsset: string,
    quoteAsset: string,
    quantity: string
  ): Promise<ApiResponse> {
    return this.placeMarketOrder(baseAsset, quoteAsset, 'ask', quantity);
  }

  // Order cancellation
  async cancelOrder(
    orderId: string,
    side: 'bid' | 'ask',
    baseAsset: string,
    quoteAsset: string
  ): Promise<ApiResponse> {
    const payload: CancelOrderPayload = {
      orderId,
      side,
      baseAsset,
      quoteAsset
    };

    return this.makeApiCall('cancel_order', payload);
  }

  // Order retrieval
  async getOrder(orderId: string): Promise<ApiResponse> {
    const payload: OrderStatusRequest = {
      orderId
    };

    return this.makeApiCall('order', payload);
  }

  // Order book retrieval
  async getOrderBook(symbol: string): Promise<ApiResponse> {
    const payload: OrderBookRequest = {
      symbol
    };

    return this.makeApiCall('orderbook', payload);
  }

  // Get best order (best bid or ask)
  async getBestOrder(
    baseAsset: string,
    quoteAsset: string,
    side: 'bid' | 'ask'
  ): Promise<ApiResponse> {
    const payload: BestOrderRequest = {
      baseAsset,
      quoteAsset,
      side
    };

    return this.makeApiCall('get_best_order', payload);
  }

  async getBestBid(baseAsset: string, quoteAsset: string): Promise<ApiResponse> {
    return this.getBestOrder(baseAsset, quoteAsset, 'bid');
  }

  async getBestAsk(baseAsset: string, quoteAsset: string): Promise<ApiResponse> {
    return this.getBestOrder(baseAsset, quoteAsset, 'ask');
  }

  // Check available funds
  async checkAvailableFunds(asset: string): Promise<ApiResponse> {
    const payload: AvailableFundsRequest = {
      account: this.account,
      asset
    };

    return this.makeApiCall('check_available_funds', payload);
  }

  // Settlement system health check
  async getSettlementHealth(): Promise<SettlementHealth> {
    const response = await fetch(`${this.baseUrl}/api/settlement_health`);
    return await response.json();
  }

  // Utility methods
  getAccount(): string {
    return this.account;
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  // Helper method to format symbol from base and quote assets
  static formatSymbol(baseAsset: string, quoteAsset: string): string {
    return `${baseAsset}_${quoteAsset}`;
  }

  // Helper method to parse symbol into base and quote assets
  static parseSymbol(symbol: string): { baseAsset: string; quoteAsset: string } {
    const [baseAsset, quoteAsset] = symbol.split('_');
    if (!baseAsset || !quoteAsset) {
      throw new Error(`Invalid symbol format: ${symbol}. Expected format: BASE_QUOTE`);
    }
    return { baseAsset, quoteAsset };
  }

  // Batch operations helper
  async getMarketOverview(baseAsset: string, quoteAsset: string): Promise<{
    symbol: string;
    orderbook: ApiResponse;
    bestBid: ApiResponse;
    bestAsk: ApiResponse;
    lockedFunds: {
      base: ApiResponse;
      quote: ApiResponse;
    };
  }> {
    const symbol = HyperFillMMClient.formatSymbol(baseAsset, quoteAsset);

    const [orderbook, bestBid, bestAsk, lockedBase, lockedQuote] = await Promise.all([
      this.getOrderBook(symbol),
      this.getBestBid(baseAsset, quoteAsset),
      this.getBestAsk(baseAsset, quoteAsset),
      this.checkAvailableFunds(baseAsset),
      this.checkAvailableFunds(quoteAsset)
    ]);

    return {
      symbol,
      orderbook,
      bestBid,
      bestAsk,
      lockedFunds: {
        base: lockedBase,
        quote: lockedQuote
      }
    };
  }
}

export default HyperFillMMClient;