import { nanoid } from "nanoid";
import { ethers } from "ethers";
import WebSocket from "ws";

// Types and Interfaces
export interface FilamentConfig {
  baseUrl?: string;
  privateKey: string;
  account: string;
}

export interface Asset {
  id: string;
  indexToken: string;
  assetName: string;
  markPrice: number;
  spotPrice: number;
  tradingEnabled: boolean;
  minLeverage: number;
  maxLeverage: number;
  tickSize: number;
  stepSize: number;
}

export interface Order {
  orderId: string;
  account: string;
  token: string;
  size: number;
  collateral: number;
  side: "BUY" | "SELL";
  typeOfOrder: "Limit" | "Market" | "TakeProfit" | "StopLoss";
  triggerPrice: number;
  orderStatus: "OPEN" | "MATCHED" | "CANCELLED" | "FAILED";
  orderValue: number;
  openTime: string;
  closedTime?: string;
  decreaseOrder: boolean;
  isStopLoss: boolean;
  isTakeProfit: boolean;
}

export interface Position {
  openTime: string;
  account: string;
  token: string;
  side: "BUY" | "SELL";
  entryPrice: number;
  markPrice: number;
  size: number;
  quantity: number;
  collateral: number;
  fees: number;
  realizedPnL: number;
  takeProfit?: number;
  stopLoss?: number;
  liquidationPrice: number;
  leverage: number;
}

export interface Trade {
  id: string;
  tradeTime: string;
  account: string;
  token: string;
  side: "BUY" | "SELL";
  price: number;
  size: number;
  tradeValue: number;
  fee: number;
  closedPnL: number;
  orderType: string;
  associatedOrderId: string;
}

export interface LimitOrderParams {
  asset: string;
  isBuy: boolean;
  size: number;
  leverage: number;
  limitPrice: string;
  reduceOnly?: boolean;
  tif?: "Gtc" | "Ioc" | "Fok";
}

export interface MarketOrderParams {
  asset: string;
  isBuy: boolean;
  size: number;
  leverage: number;
  slippage?: number;
  reduceOnly?: boolean;
}

export interface CancelOrderParams {
  orderId: string;
}

export interface UpdateMarginParams {
  asset: string;
  collateral: number;
  isBuy: boolean;
  isIncrement: boolean;
  takeProfit?: string;
  stopLoss?: string;
  size?: string;
}

export class FilamentAPIClient {
  private config: FilamentConfig;
  private baseUrl: string;
  private wallet: ethers.Wallet;

  constructor(config: FilamentConfig) {
    this.config = config;
    this.baseUrl = config.baseUrl || "https://orderbook.filament.finance/sei";
    this.wallet = new ethers.Wallet(config.privateKey);
    
    if (this.wallet.address.toLowerCase() !== config.account.toLowerCase()) {
      throw new Error("Private key does not match the provided account address");
    }
  }

  // Utility Functions
  private async handleOrderSignature(orderId: string): Promise<string> {
    return await this.wallet.signMessage(orderId);
  }

  private generateOrderId(): string {
    return nanoid().toLowerCase();
  }

  private async makeRequest<T>(
    endpoint: string,
    method: "GET" | "POST" = "GET",
    body?: any
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const options: RequestInit = {
      method,
      headers: {
        "Content-Type": "application/json",
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  }

  // Asset Management
  async getAssets(): Promise<Asset[]> {
    return await this.makeRequest<Asset[]>("/filament/api/v1/assets");
  }

  async getAssetByName(assetName: string): Promise<Asset | null> {
    const assets = await this.getAssets();
    return assets.find(asset => asset.assetName === assetName) || null;
  }

  // Order Management
  async placeLimitOrder(params: LimitOrderParams): Promise<any> {
    const orderId = this.generateOrderId();
    const signature = await this.handleOrderSignature(orderId);

    const payload = {
      type: "order",
      referralCode: null,
      orders: [
        {
          account: this.config.account.toLowerCase(),
          indexToken: params.asset,
          orderId,
          signature,
          isBuy: params.isBuy,
          size: params.size,
          leverage: params.leverage,
          reduceOnly: params.reduceOnly || false,
          orderType: {
            type: "limit",
            limit: {
              tif: params.tif || "Gtc",
              limitPrice: params.limitPrice,
            },
          },
        },
      ],
    };

    return await this.makeRequest("/filament/api/v1/exchange", "POST", payload);
  }

  async placeMarketOrder(params: MarketOrderParams): Promise<any> {
    const orderId = this.generateOrderId();
    const signature = await this.handleOrderSignature(orderId);

    const payload = {
      type: "order",
      referralCode: null,
      orders: [
        {
          account: this.config.account.toLowerCase(),
          indexToken: params.asset,
          orderId,
          signature,
          isBuy: params.isBuy,
          size: params.size,
          leverage: params.leverage,
          reduceOnly: params.reduceOnly || false,
          orderType: {
            type: "trigger",
            trigger: {
              isMarket: true,
              slippage: params.slippage || 5,
            },
          },
        },
      ],
    };

    return await this.makeRequest("/filament/api/v1/exchange", "POST", payload);
  }

  async cancelOrder(params: CancelOrderParams): Promise<any> {
    const signature = await this.handleOrderSignature(params.orderId);

    const payload = {
      type: "cancel",
      cancels: [
        {
          account: this.config.account.toLowerCase(),
          orderId: params.orderId,
          signature,
        },
      ],
    };

    return await this.makeRequest("/filament/api/v1/exchange", "POST", payload);
  }

  // Position Management
  async closePosition(position: Position, closePrice: string): Promise<any> {
    // For closing positions, we need to place an order in the opposite direction
    const isBuy = position.side === "SELL"; // Opposite of current position
    
    return await this.placeLimitOrder({
      asset: position.token,
      isBuy,
      size: position.size,
      leverage: -1, // Negative leverage for reduce-only orders
      limitPrice: closePrice,
      reduceOnly: true,
    });
  }

  async updateIsolatedMargin(params: UpdateMarginParams): Promise<any> {
    const orderId = this.generateOrderId();
    const signature = await this.handleOrderSignature(orderId);

    let payload: any = {
      type: "updateIsolatedMargin",
      account: this.config.account.toLowerCase(),
      referralCode: null,
      asset: params.asset,
      collateral: params.collateral,
      isBuy: params.isBuy,
      isIncrement: params.isIncrement,
      orderId,
      signature,
      tpsl: "na",
      size: params.size || "",
    };

    // Add take profit/stop loss if provided
    if (params.takeProfit && params.stopLoss) {
      const tpOrderId = this.generateOrderId();
      const slOrderId = this.generateOrderId();
      const tpSignature = await this.handleOrderSignature(tpOrderId);
      const slSignature = await this.handleOrderSignature(slOrderId);

      payload = {
        ...payload,
        takeProfit: params.takeProfit,
        takeProfitOrderId: tpOrderId,
        takeProfitSignature: tpSignature,
        stopLoss: params.stopLoss,
        stopLossOrderId: slOrderId,
        stopLossSignature: slSignature,
        tpsl: "both",
      };
    } else if (params.takeProfit) {
      const tpOrderId = this.generateOrderId();
      const tpSignature = await this.handleOrderSignature(tpOrderId);

      payload = {
        ...payload,
        takeProfit: params.takeProfit,
        takeProfitOrderId: tpOrderId,
        takeProfitSignature: tpSignature,
        tpsl: "tp",
      };
    } else if (params.stopLoss) {
      const slOrderId = this.generateOrderId();
      const slSignature = await this.handleOrderSignature(slOrderId);

      payload = {
        ...payload,
        stopLoss: params.stopLoss,
        stopLossOrderId: slOrderId,
        stopLossSignature: slSignature,
        tpsl: "sl",
      };
    }

    return await this.makeRequest("/filament/api/v1/exchange", "POST", payload);
  }

  // Data Retrieval Methods
  async getOpenOrders(token?: string, side?: "BUY" | "SELL", page = 0, size = 10): Promise<any> {
    let endpoint = `/v1/orders/open-orders/paginated/account/${this.config.account.toLowerCase()}?page=${page}&size=${size}`;
    
    if (token) endpoint += `&token=${token}`;
    if (side) endpoint += `&side=${side}`;

    return await this.makeRequest(endpoint);
  }

  async getClosedOrders(token?: string, side?: "BUY" | "SELL", page = 0, size = 10): Promise<any> {
    let endpoint = `/v1/orders/closed-orders/paginated/account/${this.config.account.toLowerCase()}?page=${page}&size=${size}`;
    
    if (token) endpoint += `&token=${token}`;
    if (side) endpoint += `&side=${side}`;

    return await this.makeRequest(endpoint);
  }

  async getPositions(page = 0, size = 10): Promise<any> {
    return await this.makeRequest(`/v1/positions/trades/paginated/${this.config.account.toLowerCase()}?page=${page}&size=${size}`);
  }

  async getTradeHistory(page = 0, size = 10, associatedOrderId?: string): Promise<any> {
    let endpoint = `/v1/positions/tradeHistory/paginated/${this.config.account.toLowerCase()}?page=${page}&size=${size}`;
    
    if (associatedOrderId) endpoint += `&associatedOrderId=${associatedOrderId}`;

    return await this.makeRequest(endpoint);
  }

  async getAccountBalance(): Promise<number> {
    return await this.makeRequest(`/v1/accountData/balance/${this.config.account.toLowerCase()}`);
  }

  async getPositionBalance(): Promise<any[]> {
    return await this.makeRequest(`/v1/positions/balance/${this.config.account.toLowerCase()}`);
  }

  async getOrdersStatus(orderIds: string[]): Promise<Order[]> {
    return await this.makeRequest("/v1/orders/latest-status", "POST", orderIds);
  }

  // WebSocket Connections
  createOrderBookWebSocket(indexToken: string): WebSocket {
    const ws = new WebSocket("wss://orderbook.filament.finance/sei/api/order-book/book-websocket");

    ws.on("open", () => {
      console.log("OrderBook WebSocket connected");
      
      // Send STOMP connect frame
      ws.send("CONNECT\naccept-version:1.1,1.2\nhost:orderbook.filament.finance\n\n\0");
      
      setTimeout(() => {
        // Subscribe to orderbook state
        ws.send("SUBSCRIBE\nid:sub-0\ndestination:/topic/orderBookState\n\n\0");
        
        // Send init message
        ws.send(`SEND\ndestination:/app/init\n\n${indexToken}\0`);
      }, 1000);
    });

    ws.on("message", (data) => {
      console.log("OrderBook update:", data.toString());
    });

    return ws;
  }

  createOrderUpdatesWebSocket(): WebSocket {
    const ws = new WebSocket("wss://orderbook.filament.finance/sei/api/order-websocket");

    ws.on("open", () => {
      console.log("Order Updates WebSocket connected");
      
      // Send STOMP connect frame
      ws.send("CONNECT\naccept-version:1.1,1.2\nhost:orderbook.filament.finance\n\n\0");
      
      setTimeout(() => {
        const account = this.config.account.toLowerCase();
        
        // Subscribe to order updates
        ws.send(`SUBSCRIBE\nid:sub-0\ndestination:/topic/order-updates/${account}\n\n\0`);
        
        // Send init message
        const payload = JSON.stringify({ account });
        ws.send(`SEND\ndestination:/app/init/order-updates\ncontent-type:text/plain\n\n${payload}\0`);
      }, 1000);
    });

    ws.on("message", (data) => {
      try {
        const message = data.toString();
        if (message.includes("\n\n")) {
          const body = message.split("\n\n", 1)[1]?.replace("\0", "");
          if (body) {
            const orderUpdate = JSON.parse(body);
            console.log("Order update:", orderUpdate);
          }
        }
      } catch (error) {
        console.error("Error parsing order update:", error);
      }
    });

    return ws;
  }

  createLiveFeedWebSocket(indexToken: string): WebSocket {
    const ws = new WebSocket("wss://orderbook.filament.finance/sei/api/order-book/orderbook-websocket");

    ws.on("open", () => {
      console.log("Live Feed WebSocket connected");
      
      // Send STOMP connect frame
      ws.send("CONNECT\naccept-version:1.1,1.2\nhost:orderbook.filament.finance\n\n\0");
      
      setTimeout(() => {
        // Subscribe to live feed
        ws.send("SUBSCRIBE\nid:sub-0\ndestination:/topic/livefeed\n\n\0");
        
        // Send init message
        ws.send(`SEND\ndestination:/app/init\n\n${indexToken}\0`);
      }, 1000);
    });

    ws.on("message", (data) => {
      try {
        const message = data.toString();
        if (message.includes("\n\n")) {
          const body = message.split("\n\n", 1)[1]?.replace("\0", "");
          if (body) {
            const liveFeed = JSON.parse(body);
            console.log("Live feed update:", liveFeed);
          }
        }
      } catch (error) {
        console.error("Error parsing live feed:", error);
      }
    });

    return ws;
  }

  // High-level trading methods
  async processOrders(price: string, isBuy: boolean, asset: string): Promise<any> {
    return await this.placeLimitOrder({
      asset,
      isBuy,
      size: 15000, // Default size from documentation
      leverage: 30, // Default leverage from documentation  
      limitPrice: price,
    });
  }

  async createMarketMakerStrategy(asset: string, basePrice: number, spread: number, size: number): Promise<void> {
    const buyPrice = (basePrice * (1 - spread)).toString();
    const sellPrice = (basePrice * (1 + spread)).toString();

    try {
      // Place buy order below market
      await this.placeLimitOrder({
        asset,
        isBuy: true,
        size,
        leverage: 1.1,
        limitPrice: buyPrice,
      });

      // Place sell order above market
      await this.placeLimitOrder({
        asset,
        isBuy: false,
        size,
        leverage: 1.1,
        limitPrice: sellPrice,
      });

      console.log(`Market making orders placed for ${asset}`);
      console.log(`Buy at: ${buyPrice}, Sell at: ${sellPrice}`);
    } catch (error) {
      console.error("Error placing market making orders:", error);
    }
  }
}

// Usage Example:
/*
const client = new FilamentClient({
  privateKey: "your_private_key_here",
  account: "0xYourAccountAddress",
});

// Get all assets
const assets = await client.getAssets();

// Place a limit buy order
await client.placeLimitOrder({
  asset: "BTC",
  isBuy: true,
  size: 100,
  leverage: 2,
  limitPrice: "60000",
});

// Get open positions
const positions = await client.getPositions();

// Create WebSocket connections
const orderBookWS = client.createOrderBookWebSocket("0x152b9d0fdc40c096757f570a51e494bd4b943e50");
const orderUpdatesWS = client.createOrderUpdatesWebSocket();
*/

export default FilamentClient;