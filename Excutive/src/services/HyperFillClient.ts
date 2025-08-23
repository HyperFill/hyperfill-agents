import { ethers } from "ethers";
import { config } from "./config.js";

interface OrderRequest {
  account: string;
  baseAsset: string;
  quoteAsset: string;
  side: "bid" | "ask";
  price: string;
  quantity: string;
}

interface CancelOrderRequest {
  orderId: string;
  side: string;
  baseAsset: string;
  quoteAsset: string;
}

interface OrderbookRequest {
  symbol: string;
}

interface BestOrderRequest {
  baseAsset: string;
  quoteAsset: string;
  side: string;
}

interface FundsRequest {
  account: string;
  asset: string;
}

// Response types from HyperFill API
interface Trade {
  timestamp: number;
  price: number;
  quantity: number;
  time: number;
  party1: [string, string, number | null, number | null];
  party2: [string, string, number | null, number | null];
}

interface OrderData {
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

interface ApiResponse {
  message: string;
  status_code: number;
  order?: OrderData;
  nextBest?: OrderData;
  taskId?: number;
  orderbook?: {
    bids: Array<[number, number]>;
    asks: Array<[number, number]>;
  };
  account?: string;
  asset?: string;
  lockedAmount?: number;
}

interface OrderResponse {
  success: boolean;
  orderId?: number;
  order?: OrderData;
  trades?: Trade[];
  message: string;
  taskId?: number;
}

interface OrderbookData {
  bids: Array<[number, number]>;
  asks: Array<[number, number]>;
  bestBid: number | null;
  bestAsk: number | null;
  spread: number | null;
}

interface FundsData {
  account: string;
  asset: string;
  lockedAmount: number;
}

export class HyperFillClient {
  private baseUrl: string;
  private account: string;
  private privateKey: string;
  private wallet: ethers.Wallet;

  constructor(baseUrl: string = config.hyperFillApiUrl) {
    this.baseUrl = baseUrl;
    this.account = config.account;
    this.privateKey = config.agentPrivateKey;
    
    if (!this.account || !this.privateKey) {
      throw new Error("Account and private key must be configured in environment variables");
    }

    this.wallet = new ethers.Wallet(this.privateKey);
  }

  private async makeRequest<T>(endpoint: string, data: Record<string, any>): Promise<T> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `payload=${encodeURIComponent(JSON.stringify(data))}`
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json() as T;
      return result;
    } catch (error) {
      console.error(`HyperFill API request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  async placeLimitOrder(
    asset: string,
    isBuy: boolean,
    price: string,
    size: number
  ): Promise<OrderResponse> {
    try {
      const [baseAsset, quoteAsset] = asset.split('/');
      if (!baseAsset || !quoteAsset) {
        throw new Error(`Invalid asset format: ${asset}. Expected format: BASE/QUOTE`);
      }
      
      const orderData: OrderRequest = {
        account: this.account,
        baseAsset,
        quoteAsset,
        side: isBuy ? "bid" : "ask",
        price,
        quantity: size.toString()
      };

      const result = await this.makeRequest<ApiResponse>('/api/register_order', orderData);

      return {
        success: result.status_code === 1,
        orderId: result.order?.orderId,
        order: result.order,
        trades: result.order?.trades || [],
        message: result.message,
        taskId: result.taskId
      };
    } catch (error) {
      console.error('Failed to place limit order:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error occurred"
      };
    }
  }

  async placeMarketOrder(
    asset: string,
    isBuy: boolean,
    size: number
  ): Promise<OrderResponse> {
    try {
      const orderbook = await this.getOrderbook(asset);
      if (!orderbook) {
        throw new Error("Could not retrieve orderbook");
      }

      const targetPrice = isBuy ? orderbook.bestAsk : orderbook.bestBid;
      if (targetPrice === null) {
        throw new Error(`No ${isBuy ? 'ask' : 'bid'} liquidity available`);
      }

      return this.placeLimitOrder(asset, isBuy, targetPrice.toString(), size);
    } catch (error) {
      console.error('Failed to place market order:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Market order failed"
      };
    }
  }

  async cancelOrder(orderId: string, asset: string, side: string): Promise<OrderResponse> {
    try {
      const [baseAsset, quoteAsset] = asset.split('/');
      if (!baseAsset || !quoteAsset) {
        throw new Error(`Invalid asset format: ${asset}. Expected format: BASE/QUOTE`);
      }
      
      const cancelData: CancelOrderRequest = {
        orderId,
        side,
        baseAsset,
        quoteAsset
      };

      const result = await this.makeRequest<ApiResponse>('/api/cancel_order', cancelData);

      return {
        success: result.status_code === 1,
        order: result.order,
        message: result.message
      };
    } catch (error) {
      console.error('Failed to cancel order:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Cancel order failed"
      };
    }
  }

  async getOrderbook(asset: string): Promise<OrderbookData | null> {
    try {
      const symbol = asset.replace('/', '_');
      
      const result = await this.makeRequest<ApiResponse>('/api/orderbook', { symbol });
      
      if (!result.orderbook) {
        console.warn(`No orderbook data returned for ${symbol}`);
        return null;
      }

      const { bids = [], asks = [] } = result.orderbook;
      
      // Safely calculate best prices
      const bestBid = bids.length > 0 
        ? Math.max(...bids.map(([price]) => price))
        : null;
      
      const bestAsk = asks.length > 0 
        ? Math.min(...asks.map(([price]) => price))
        : null;

      const spread = bestBid && bestAsk 
        ? ((bestAsk - bestBid) / bestBid) * 100
        : null;

      return {
        bids,
        asks,
        bestBid,
        bestAsk,
        spread
      };
    } catch (error) {
      console.error('Failed to get orderbook:', error);
      return null;
    }
  }

  async getBestOrder(asset: string, side: "bid" | "ask"): Promise<OrderData | null> {
    try {
      const [baseAsset, quoteAsset] = asset.split('/');
      if (!baseAsset || !quoteAsset) {
        throw new Error(`Invalid asset format: ${asset}. Expected format: BASE/QUOTE`);
      }
      
      const requestData: BestOrderRequest = {
        baseAsset,
        quoteAsset,
        side
      };

      const result = await this.makeRequest<ApiResponse>('/api/get_best_order', requestData);
      return result.order || null;
    } catch (error) {
      console.error('Failed to get best order:', error);
      return null;
    }
  }

  async checkFunds(asset: string): Promise<FundsData | null> {
    try {
      const requestData: FundsRequest = {
        account: this.account,
        asset
      };

      const result = await this.makeRequest<ApiResponse>('/api/check_available_funds', requestData);
      
      if (result.status_code !== 1) {
        throw new Error(result.message);
      }

      return {
        account: result.account!,
        asset: result.asset!,
        lockedAmount: result.lockedAmount!
      };
    } catch (error) {
      console.error('Failed to check funds:', error);
      return null;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        timeout: 5000
      } as RequestInit);
      
      return response.ok;
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }
}

export default HyperFillClient;
