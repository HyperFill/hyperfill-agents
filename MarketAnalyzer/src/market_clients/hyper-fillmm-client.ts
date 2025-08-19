import { nanoid } from "nanoid";
import { ethers } from "ethers";

// Types and Interfaces
export interface OrderPayload {
  type: string;
  referralCode: string | null;
  orders: Order[];
}

export interface Order {
  account: string;
  indexToken: string;
  orderId: string;
  signature: string;
  isBuy: boolean;
  size: number;
  leverage: number;
  reduceOnly: boolean;
  orderType: {
    type: 'limit' | 'trigger';
    limit?: {
      tif: 'Gtc';
      limitPrice: string;
    };
    trigger?: {
      isMarket: boolean;
      slippage: number;
    };
  };
}

export interface CancelOrderPayload {
  type: 'cancel';
  cancels: {
    account: string;
    orderId: string;
    signature: string;
  }[];
}

export interface CollateralUpdatePayload {
  type: 'updateIsolatedMargin';
  account: string;
  referralCode: string | null;
  asset: string;
  collateral: number | string;
  isBuy: boolean;
  isIncrement: boolean;
  orderId: string;
  signature: string;
  tpsl: 'na' | 'tp' | 'sl' | 'both';
  size: string;
  takeProfit?: string;
  takeProfitOrderId?: string;
  takeProfitSignature?: string;
  stopLoss?: string;
  stopLossOrderId?: string;
  stopLossSignature?: string;
}

export interface AssetInfo {
  id: string;
  assetName: string;
  indexToken: string;
  tickPrice: number;
  bidPrice: number;
  askPrice: number;
  tradingEnabled: boolean;
}

export interface Position {
  openTime: string;
  account: string;
  token: string;
  side: 'BUY' | 'SELL';
  entryPrice: number;
  markPrice: number;
  size: number;
  quantity: number;
  collateral: number;
  fees: number;
  realizedPnL: number;
  takeProfit: number | null;
  stopLoss: number | null;
  liquidationPrice: number;
  leverage: number;
}

export interface OrderStatus {
  orderId: string;
  account: string;
  token: string;
  size: number;
  // collateral: number;
  side: 'BUY' | 'SELL';
  typeOfOrder: 'Limit' | 'Market' | 'TakeProfit' | 'StopLoss';
  triggerPrice: number;
  orderStatus: 'OPEN' | 'MATCHED' | 'CANCELLED' | 'FAILED';
  orderValue: number;
  openTime: string;
  closedTime?: string;
  decreaseOrder: boolean;
  isStopLoss: boolean;
  isTakeProfit: boolean;
}

export interface TradeHistory {
  id: string;
  tradeTime: string;
  account: string;
  token: string;
  side: 'BUY' | 'SELL';
  price: number;
  size: number;
  tradeValue: number;
  fee: number;
  closedPnL: number;
  orderType: string;
  associatedOrderId: string;
}

export interface HyperFillConfig {
  baseUrl?: string;
  privateKey: string;
  account: string,
  simulationMode: boolean,
  // simulationMode?: boolean; // Add simulation mode flag FUTURE
}

export class HyperFillMMClient {
  private baseUrl: string;
  private account: string;
  private privateKey: string;
  // private defaultLeverage: number;
  private simulationMode: boolean;

  // State management
  private _assets: Map<string, AssetInfo> = new Map();
  private _positions: Map<string, Position> = new Map();
  private _openOrders: Map<string, OrderStatus> = new Map();
  private _balance: number = 0;
  private _lastUpdateTime: number = 0;

  // Simulation data storage
  private _simulatedOrders: Map<string, OrderStatus> = new Map();
  private _simulatedPositions: Map<string, Position> = new Map();
  private _simulatedTradeHistory: TradeHistory[] = [];

  constructor(config: HyperFillConfig) {
    this.baseUrl = config.baseUrl || "https://orderbook.hyperfill.finance/sei";
    this.account = config.account.toLowerCase();
    this.privateKey = config.privateKey;
    // this.defaultLeverage = config.defaultLeverage || 1.1;
    this.simulationMode = config.simulationMode || true;

    // Initialize simulation data
    if (this.simulationMode) {
      this.initializeSimulationData();
    }
  }

  // Initialize dummy data for simulation
  private initializeSimulationData(): void {
    // Add some dummy open orders
    const dummyOrder1: OrderStatus = {
      orderId: nanoid(),
      account: this.account,
      token: "SEI/USDT",
      size: 1000,
      // collateral: 100,
      side: 'BUY',
      typeOfOrder: 'Limit',
      triggerPrice: 0.315,
      orderStatus: 'OPEN',
      orderValue: 315,
      openTime: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
      decreaseOrder: false,
      isStopLoss: false,
      isTakeProfit: false,
    };

    const dummyOrder2: OrderStatus = {
      orderId: nanoid(),
      account: this.account,
      token: "BTC/USDT",
      size: 0.1,
      // collateral: 500,
      side: 'SELL',
      typeOfOrder: 'Limit',
      triggerPrice: 45500,
      orderStatus: 'OPEN',
      orderValue: 4550,
      openTime: new Date(Date.now() - 1800000).toISOString(), // 30 min ago
      decreaseOrder: false,
      isStopLoss: false,
      isTakeProfit: false,
    };

    this._simulatedOrders.set(dummyOrder1.orderId, dummyOrder1);
    this._simulatedOrders.set(dummyOrder2.orderId, dummyOrder2);

    // Add some dummy positions
    const dummyPosition1: Position = {
      openTime: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
      account: this.account,
      token: "ETH/USDT",
      side: 'BUY',
      entryPrice: 2450,
      markPrice: 2465,
      size: 2,
      quantity: 2,
      collateral: 500,
      fees: 2.45,
      realizedPnL: 30,
      takeProfit: null,
      stopLoss: 2400,
      liquidationPrice: 2350,
      leverage: 10,
    };

    this._simulatedPositions.set("ETH/USDT", dummyPosition1);

    // Add some trade history
    this._simulatedTradeHistory = [
      {
        id: nanoid(),
        tradeTime: new Date(Date.now() - 3600000).toISOString(),
        account: this.account,
        token: "SEI/USDT",
        side: 'BUY',
        price: 0.318,
        size: 500,
        tradeValue: 159,
        fee: 0.159,
        closedPnL: 0,
        orderType: "Market",
        associatedOrderId: nanoid(),
      },
      {
        id: nanoid(),
        tradeTime: new Date(Date.now() - 7200000).toISOString(),
        account: this.account,
        token: "ETH/USDT",
        side: 'BUY',
        price: 2450,
        size: 2,
        tradeValue: 4900,
        fee: 4.9,
        closedPnL: 0,
        orderType: "Limit",
        associatedOrderId: nanoid(),
      }
    ];

    // Set initial balance
    this._balance = 10000;
  }

  // Generate realistic dummy assets
  private generateDummyAssets(): AssetInfo[] {
    const assets: AssetInfo[] = [
      {
        id: "1",
        assetName: "SEI/USDT",
        indexToken: "1",
        tickPrice: 0.32121,
        bidPrice: 0.32119,
        askPrice: 0.3225,
        tradingEnabled: true,
      },
      {
        id: "2",
        assetName: "BTC/USDT",
        indexToken: "2",
        tickPrice: 45234.56,
        bidPrice: 45230.12,
        askPrice: 45245.78,
        tradingEnabled: true,
      },
      {
        id: "3",
        assetName: "ETH/USDT",
        indexToken: "3",
        tickPrice: 2465.34,
        bidPrice: 2464.12,
        askPrice: 2466.89,
        tradingEnabled: true,
      },
      {
        id: "4",
        assetName: "SOL/USDT",
        indexToken: "4",
        tickPrice: 89.45,
        bidPrice: 89.42,
        askPrice: 89.67,
        tradingEnabled: true,
      },
      {
        id: "5",
        assetName: "AVAX/USDT",
        indexToken: "5",
        tickPrice: 34.78,
        bidPrice: 34.76,
        askPrice: 34.82,
        tradingEnabled: false, // Disabled for testing
      }
    ];

    return assets;
  }

  // Getters for state
  get assets(): AssetInfo[] {
    return Array.from(this._assets.values());
  }

  get positions(): Position[] {
    return Array.from(this._positions.values());
  }

  get openOrders(): OrderStatus[] {
    return Array.from(this._openOrders.values());
  }

  get balance(): number {
    return this._balance;
  }

  get lastUpdateTime(): Date {
    return new Date(this._lastUpdateTime);
  }

  // Asset Management
  async fetchAssets(): Promise<AssetInfo[]> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100));

    let assets: AssetInfo[];

    if (this.simulationMode) {
      assets = this.generateDummyAssets();
    } else {
      const response = await fetch(`${this.baseUrl}/filament/api/v1/assets`);
      assets = await response.json();
    }

    // Update state
    this._assets.clear();
    assets.forEach(asset => {
      this._assets.set(asset.assetName, asset);
    });

    this._lastUpdateTime = Date.now();
    return assets;
  }

  getAsset(symbol: string): AssetInfo | undefined {
    return this._assets.get(symbol);
  }

  getAssetByIndexToken(indexToken: string): AssetInfo | undefined {
    return Array.from(this._assets.values()).find(asset => asset.indexToken === indexToken);
  }

  // Order Placement Functions
  async placeLimitOrder(
    asset: string,
    isBuy: boolean,
    price: string,
    size: number,
    leverage?: number,
    reduceOnly: boolean = false
  ): Promise<{ response: any }> {
    const assetInfo = this.getAsset(asset);
    if (!assetInfo) {
      throw new Error(`Asset ${asset} not found. Please fetch assets first.`);
    }

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 200));

    const orderId = nanoid();
    const order = {
      account: this.account,
      indexToken: assetInfo.indexToken,
      orderId,
      signature: "dummy_signature_" + orderId,
      isBuy,
      size,
      leverage: leverage,
      reduceOnly,
      orderType: {
        type: 'limit' as const,
        limit: {
          tif: 'Gtc' as const,
          limitPrice: price,
        },
      },
    };

    if (this.simulationMode) {
      // Create order status for simulation
      const orderStatus: OrderStatus = {
        orderId,
        account: this.account,
        token: asset,
        size,
        // collateral: size * parseFloat(price),
        side: isBuy ? 'BUY' : 'SELL',
        typeOfOrder: 'Limit',
        triggerPrice: parseFloat(price),
        orderStatus: 'OPEN',
        orderValue: size * parseFloat(price),
        openTime: new Date().toISOString(),
        decreaseOrder: reduceOnly,
        isStopLoss: false,
        isTakeProfit: false,
      };

      this._simulatedOrders.set(orderId, orderStatus);
      this._openOrders.set(orderId, orderStatus);

      return { response: { success: true, orderId, order } };
    }

    const payload = {
      type: 'order',
      referralCode: null,
      orders: [order]
    };

    const response = await fetch(`${this.baseUrl}/hyperfill/api/v1/exchange`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    return { response: await response.json() };
  }

  async placeMarketOrder(
    asset: string,
    isBuy: boolean,
    size: number,
    leverage?: number,
    slippage?: number,
    reduceOnly: boolean = false
  ): Promise<{ response: any }> {
    const assetInfo = this.getAsset(asset);
    if (!assetInfo) {
      throw new Error(`Asset ${asset} not found. Please fetch assets first.`);
    }

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 150));

    const orderId = nanoid();
    const order = {
      account: this.account,
      indexToken: assetInfo.indexToken,
      orderId,
      signature: "dummy_signature_" + orderId,
      isBuy,
      size,
      // leverage: leverage || this.defaultLeverage,
      reduceOnly,
      orderType: {
        type: 'trigger' as const,
        trigger: {
          isMarket: true,
          slippage: slippage || 5,
        },
      },
    };

    if (this.simulationMode) {
      // Market orders execute immediately in simulation
      const executionPrice = isBuy ? assetInfo.askPrice : assetInfo.bidPrice;

      // Create trade history entry
      const trade: TradeHistory = {
        id: nanoid(),
        tradeTime: new Date().toISOString(),
        account: this.account,
        token: asset,
        side: isBuy ? 'BUY' : 'SELL',
        price: executionPrice,
        size,
        tradeValue: size * executionPrice,
        fee: (size * executionPrice) * 0.001, // 0.1% fee
        closedPnL: 0,
        orderType: "Market",
        associatedOrderId: orderId,
      };

      this._simulatedTradeHistory.unshift(trade);

      // Update balance
      const cost = trade.tradeValue + trade.fee;
      this._balance -= isBuy ? cost : -cost;

      return {
        response: {
          success: true,
          orderId,
          executedPrice: executionPrice,
          executedSize: size,
          trade
        }
      };
    }

    const payload = {
      type: 'order',
      referralCode: null,
      orders: [order],
    };

    const response = await fetch(`${this.baseUrl}/filament/api/v1/exchange`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    return { response: await response.json() };
  }

  async cancelOrder(orderId: string): Promise<boolean> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100));

    if (this.simulationMode) {
      const order = this._simulatedOrders.get(orderId);
      if (order) {
        order.orderStatus = 'CANCELLED';
        order.closedTime = new Date().toISOString();
        this._openOrders.delete(orderId);
        return true;
      }
      return false;
    }

    const payload = {
      type: 'cancel',
      cancels: [
        {
          account: this.account,
          orderId,
          signature: "dummy_signature_" + orderId,
        },
      ],
    };

    const response = await fetch(`${this.baseUrl}/filament/api/v1/exchange`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      this._openOrders.delete(orderId);
      return true;
    }
    return false;
  }

  // Position Management
  async closePosition(
    asset: string,
    closePrice: string,
    quantity?: number
  ): Promise<{ response: any }> {
    const position = this.getPosition(asset);
    if (!position) {
      throw new Error(`No open position found for ${asset}`);
    }

    const isBuy = position.side === 'SELL';
    const sizeToClose = quantity ? quantity * parseFloat(closePrice) : position.size;

    return this.placeLimitOrder(asset, isBuy, closePrice, sizeToClose, undefined, true);
  }

  // Data Retrieval Functions
  async fetchOpenOrders(asset?: string, side?: 'BUY' | 'SELL', page: number = 0, size: number = 10): Promise<OrderStatus[]> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 50));

    if (this.simulationMode) {
      let orders = Array.from(this._simulatedOrders.values())
        .filter(order => order.orderStatus === 'OPEN');

      if (asset) {
        orders = orders.filter(order => order.token === asset);
      }
      if (side) {
        orders = orders.filter(order => order.side === side);
      }

      // Simulate pagination
      const start = page * size;
      const paginatedOrders = orders.slice(start, start + size);

      // Update state
      if (page === 0) this._openOrders.clear();
      paginatedOrders.forEach(order => {
        this._openOrders.set(order.orderId, order);
      });

      this._lastUpdateTime = Date.now();
      return paginatedOrders;
    }

    let url = `${this.baseUrl}/v1/orders/open-orders/paginated/account/${this.account}?page=${page}&size=${size}`;
    if (asset) url += `&token=${asset}`;
    if (side) url += `&side=${side}`;

    const response = await fetch(url);
    const data = await response.json();

    if (page === 0) this._openOrders.clear();
    data.content.forEach((order: OrderStatus) => {
      this._openOrders.set(order.orderId, order);
    });

    this._lastUpdateTime = Date.now();
    return data.content;
  }

  async fetchPositions(page: number = 0, size: number = 10): Promise<Position[]> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 50));

    if (this.simulationMode) {
      const positions = Array.from(this._simulatedPositions.values());

      // Simulate pagination
      const start = page * size;
      const paginatedPositions = positions.slice(start, start + size);

      // Update state
      if (page === 0) this._positions.clear();
      paginatedPositions.forEach(position => {
        this._positions.set(position.token, position);
      });

      this._lastUpdateTime = Date.now();
      return paginatedPositions;
    }

    const response = await fetch(`${this.baseUrl}/v1/positions/trades/paginated/${this.account}?page=${page}&size=${size}`);
    const data = await response.json();

    if (page === 0) this._positions.clear();
    data.content.forEach((position: Position) => {
      this._positions.set(position.token, position);
    });

    this._lastUpdateTime = Date.now();
    return data.content;
  }

  async fetchBalance(): Promise<number> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 30));

    if (this.simulationMode) {
      // Add some random fluctuation to simulate market changes
      const fluctuation = (Math.random() - 0.5) * 10;
      this._balance += fluctuation;
      this._lastUpdateTime = Date.now();
      return this._balance;
    }

    const response = await fetch(`${this.baseUrl}/v1/accountData/balance/${this.account}`);
    const balance = await response.json();

    this._balance = parseFloat(balance);
    this._lastUpdateTime = Date.now();
    return this._balance;
  }

  async fetchTradeHistory(page: number = 0, size: number = 10, associatedOrderId?: string): Promise<TradeHistory[]> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 50));

    if (this.simulationMode) {
      let trades = [...this._simulatedTradeHistory];

      if (associatedOrderId) {
        trades = trades.filter(trade => trade.associatedOrderId === associatedOrderId);
      }

      // Simulate pagination
      const start = page * size;
      return trades.slice(start, start + size);
    }

    let url = `${this.baseUrl}/v1/positions/tradeHistory/paginated/${this.account}?page=${page}&size=${size}`;
    if (associatedOrderId) url += `&associatedOrderId=${associatedOrderId}`;

    const response = await fetch(url);
    const data = await response.json();
    return data.content;
  }

  async getOrderStatus(orderIds: string[]): Promise<OrderStatus[]> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 50));

    if (this.simulationMode) {
      const orders = orderIds
        .map(id => this._simulatedOrders.get(id))
        .filter(order => order !== undefined) as OrderStatus[];

      // Update local state
      orders.forEach(order => {
        if (order.orderStatus === 'OPEN') {
          this._openOrders.set(order.orderId, order);
        } else {
          this._openOrders.delete(order.orderId);
        }
      });

      return orders;
    }

    const response = await fetch(`${this.baseUrl}/v1/orders/latest-status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orderIds),
    });

    const orders = await response.json();

    orders.forEach((order: OrderStatus) => {
      if (order.orderStatus === 'OPEN') {
        this._openOrders.set(order.orderId, order);
      } else {
        this._openOrders.delete(order.orderId);
      }
    });

    return orders;
  }

  // State Query Functions
  getPosition(asset: string): Position | undefined {
    return this._positions.get(asset);
  }

  getOrder(orderId: string): OrderStatus | undefined {
    return this._openOrders.get(orderId);
  }

  hasOpenPosition(asset: string): boolean {
    return this._positions.has(asset);
  }

  hasOpenOrders(asset?: string): boolean {
    if (!asset) return this._openOrders.size > 0;
    return Array.from(this._openOrders.values()).some(order => order.token === asset);
  }

  // Utility Functions
  async refreshAllData(): Promise<void> {
    await Promise.all([
      this.fetchAssets(),
      this.fetchPositions(),
      this.fetchOpenOrders(),
      this.fetchBalance(),
    ]);
  }

  // Simulation specific methods
  toggleSimulationMode(enabled: boolean): void {
    this.simulationMode = enabled;
    if (enabled) {
      this.initializeSimulationData();
    }
  }

  // Method to simulate order execution (useful for testing)
  simulateOrderExecution(orderId: string, executionPrice?: number): boolean {
    if (!this.simulationMode) return false;

    const order = this._simulatedOrders.get(orderId);
    if (!order || order.orderStatus !== 'OPEN') return false;

    const asset = this.getAsset(order.token);
    if (!asset) return false;

    const price = executionPrice || (order.side === 'BUY' ? asset.askPrice : asset.bidPrice);

    // Update order status
    order.orderStatus = 'MATCHED';
    order.closedTime = new Date().toISOString();
    this._openOrders.delete(orderId);

    // Create trade history
    const trade: TradeHistory = {
      id: nanoid(),
      tradeTime: new Date().toISOString(),
      account: this.account,
      token: order.token,
      side: order.side,
      price,
      size: order.size,
      tradeValue: order.size * price,
      fee: (order.size * price) * 0.001,
      closedPnL: 0,
      orderType: order.typeOfOrder,
      associatedOrderId: orderId,
    };

    this._simulatedTradeHistory.unshift(trade);

    // Update balance
    const cost = trade.tradeValue + trade.fee;
    this._balance -= order.side === 'BUY' ? cost : -cost;

    return true;
  }
}

export default HyperFillMMClient;