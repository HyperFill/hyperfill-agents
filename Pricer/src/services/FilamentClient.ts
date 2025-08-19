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
  indexToken: string;
  assetName: string;
  markPrice: number;
  spotPrice: number;
  tradingEnabled: boolean;
  minLeverage: number;
  maxLeverage: number;
  tickSize: number;
  stepSize: number;
  initialMarginRate: number;
  minimumCollateralRequirement: number;
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
  collateral: number;
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

export interface FilamentConfig {
  baseUrl?: string;
  account: string;
  privateKey: string;
  defaultLeverage?: number;
  defaultSlippage?: number;
}

export class FilamentTrader {
  private baseUrl: string;
  private account: string;
  private privateKey: string;
  private defaultLeverage: number;
  private defaultSlippage: number;
  
  // State management
  private _assets: Map<string, AssetInfo> = new Map();
  private _positions: Map<string, Position> = new Map();
  private _openOrders: Map<string, OrderStatus> = new Map();
  private _balance: number = 0;
  private _lastUpdateTime: number = 0;

  constructor(config: FilamentConfig) {
    this.baseUrl = config.baseUrl || "https://orderbook.filament.finance/sei";
    this.account = config.account.toLowerCase();
    this.privateKey = config.privateKey;
    this.defaultLeverage = config.defaultLeverage || 1.1;
    this.defaultSlippage = config.defaultSlippage || 5;
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

  // Utility Functions
  private async handleOrderSignature(orderId: string): Promise<string> {
    const signer = new ethers.Wallet(this.privateKey);
    const orderSignature = await signer.signMessage(orderId);
    return orderSignature;
  }

  private generateOrderId(): string {
    return nanoid().toLowerCase();
  }

  // Asset Management
  async fetchAssets(): Promise<AssetInfo[]> {
    const response = await fetch(`${this.baseUrl}/filament/api/v1/assets`);
    const assets: AssetInfo[] = await response.json();
    
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
  ): Promise<{ response: Response; orderId: string }> {
    const assetInfo = this.getAsset(asset);
    if (!assetInfo) {
      throw new Error(`Asset ${asset} not found. Please fetch assets first.`);
    }

    const orderId = this.generateOrderId();
    const signature = await this.handleOrderSignature(orderId);

    const payload: OrderPayload = {
      type: 'order',
      referralCode: null,
      orders: [
        {
          account: this.account,
          indexToken: assetInfo.indexToken,
          orderId,
          signature,
          isBuy,
          size,
          leverage: leverage || this.defaultLeverage,
          reduceOnly,
          orderType: {
            type: 'limit',
            limit: {
              tif: 'Gtc',
              limitPrice: price,
            },
          },
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

    return { response, orderId };
  }

  async placeMarketOrder(
    asset: string,
    isBuy: boolean,
    size: number,
    leverage?: number,
    slippage?: number,
    reduceOnly: boolean = false
  ): Promise<{ response: Response; orderId: string }> {
    const assetInfo = this.getAsset(asset);
    if (!assetInfo) {
      throw new Error(`Asset ${asset} not found. Please fetch assets first.`);
    }

    const orderId = this.generateOrderId();
    const signature = await this.handleOrderSignature(orderId);

    const payload: OrderPayload = {
      type: 'order',
      referralCode: null,
      orders: [
        {
          account: this.account,
          indexToken: assetInfo.indexToken,
          orderId,
          signature,
          isBuy,
          size,
          leverage: leverage || this.defaultLeverage,
          reduceOnly,
          orderType: {
            type: 'trigger',
            trigger: {
              isMarket: true,
              slippage: slippage || this.defaultSlippage,
            },
          },
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

    return { response, orderId };
  }

  async cancelOrder(orderId: string): Promise<Response> {
    const signature = await this.handleOrderSignature(orderId);

    const payload: CancelOrderPayload = {
      type: 'cancel',
      cancels: [
        {
          account: this.account,
          orderId,
          signature,
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

    // Remove from local state if successful
    if (response.ok) {
      this._openOrders.delete(orderId);
    }

    return response;
  }

  // Position Management
  async closePosition(
    asset: string,
    closePrice: string,
    quantity?: number // If not provided, closes entire position
  ): Promise<{ response: Response; orderId: string }> {
    const position = this.getPosition(asset);
    if (!position) {
      throw new Error(`No open position found for ${asset}`);
    }

    // Determine order direction (opposite of position)
    const isBuy = position.side === 'SELL';
    const sizeToClose = quantity ? quantity * parseFloat(closePrice) : position.size;

    return this.placeLimitOrder(asset, isBuy, closePrice, sizeToClose, -1, true);
  }

  async addCollateral(asset: string, collateral: number, isBuy: boolean): Promise<Response> {
    const orderId = this.generateOrderId();
    const signature = await this.handleOrderSignature(orderId);

    const payload: CollateralUpdatePayload = {
      type: 'updateIsolatedMargin',
      account: this.account,
      referralCode: null,
      asset,
      collateral,
      isBuy,
      isIncrement: true,
      orderId,
      signature,
      tpsl: 'na',
      size: '',
    };

    return fetch(`${this.baseUrl}/filament/api/v1/exchange`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  }

  async removeCollateral(asset: string, collateral: number, isBuy: boolean): Promise<Response> {
    const orderId = this.generateOrderId();
    const signature = await this.handleOrderSignature(orderId);

    const payload: CollateralUpdatePayload = {
      type: 'updateIsolatedMargin',
      account: this.account,
      referralCode: null,
      asset,
      collateral,
      isBuy,
      isIncrement: false,
      orderId,
      signature,
      tpsl: 'na',
      size: '',
    };

    return fetch(`${this.baseUrl}/filament/api/v1/exchange`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  }

  async setTakeProfit(
    asset: string,
    takeProfitPrice: string,
    size: string,
    isBuy: boolean
  ): Promise<Response> {
    const orderId = this.generateOrderId();
    const takeProfitOrderId = this.generateOrderId();
    const signature = await this.handleOrderSignature(orderId);
    const takeProfitSignature = await this.handleOrderSignature(takeProfitOrderId);

    const payload: CollateralUpdatePayload = {
      type: 'updateIsolatedMargin',
      account: this.account,
      referralCode: null,
      asset,
      collateral: '',
      isBuy,
      isIncrement: true,
      orderId,
      signature,
      takeProfit: takeProfitPrice,
      takeProfitOrderId,
      takeProfitSignature,
      tpsl: 'tp',
      size,
    };

    return fetch(`${this.baseUrl}/filament/api/v1/exchange`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  }

  async setStopLoss(
    asset: string,
    stopLossPrice: string,
    size: string,
    isBuy: boolean
  ): Promise<Response> {
    const orderId = this.generateOrderId();
    const stopLossOrderId = this.generateOrderId();
    const signature = await this.handleOrderSignature(orderId);
    const stopLossSignature = await this.handleOrderSignature(stopLossOrderId);

    const payload: CollateralUpdatePayload = {
      type: 'updateIsolatedMargin',
      account: this.account,
      referralCode: null,
      asset,
      collateral: '',
      isBuy,
      isIncrement: true,
      orderId,
      signature,
      stopLoss: stopLossPrice,
      stopLossOrderId,
      stopLossSignature,
      tpsl: 'sl',
      size,
    };

    return fetch(`${this.baseUrl}/filament/api/v1/exchange`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  }

  // Data Retrieval Functions
  async fetchOpenOrders(asset?: string, side?: 'BUY' | 'SELL', page: number = 0, size: number = 10): Promise<OrderStatus[]> {
    let url = `${this.baseUrl}/v1/orders/open-orders/paginated/account/${this.account}?page=${page}&size=${size}`;
    if (asset) url += `&token=${asset}`;
    if (side) url += `&side=${side}`;

    const response = await fetch(url);
    const data = await response.json();
    
    // Update state
    if (page === 0) this._openOrders.clear(); // Clear on first page
    data.content.forEach((order: OrderStatus) => {
      this._openOrders.set(order.orderId, order);
    });

    this._lastUpdateTime = Date.now();
    return data.content;
  }

  async fetchPositions(page: number = 0, size: number = 10): Promise<Position[]> {
    const response = await fetch(`${this.baseUrl}/v1/positions/trades/paginated/${this.account}?page=${page}&size=${size}`);
    const data = await response.json();
    
    // Update state
    if (page === 0) this._positions.clear(); // Clear on first page
    data.content.forEach((position: Position) => {
      this._positions.set(position.token, position);
    });

    this._lastUpdateTime = Date.now();
    return data.content;
  }

  async fetchBalance(): Promise<number> {
    const response = await fetch(`${this.baseUrl}/v1/accountData/balance/${this.account}`);
    const balance = await response.json();
    
    this._balance = parseFloat(balance);
    this._lastUpdateTime = Date.now();
    return this._balance;
  }

  async fetchTradeHistory(page: number = 0, size: number = 10, associatedOrderId?: string): Promise<TradeHistory[]> {
    let url = `${this.baseUrl}/v1/positions/tradeHistory/paginated/${this.account}?page=${page}&size=${size}`;
    if (associatedOrderId) url += `&associatedOrderId=${associatedOrderId}`;

    const response = await fetch(url);
    const data = await response.json();
    return data.content;
  }

  async getOrderStatus(orderIds: string[]): Promise<OrderStatus[]> {
    const response = await fetch(`${this.baseUrl}/v1/orders/latest-status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orderIds),
    });

    const orders = await response.json();
    
    // Update local state
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

  // WebSocket connection helpers (you can implement these based on the documentation)
  connectOrderBookWebSocket(asset: string): WebSocket {
    const assetInfo = this.getAsset(asset);
    if (!assetInfo) {
      throw new Error(`Asset ${asset} not found`);
    }
    
    // WebSocket implementation would go here
    // Based on the documentation's WebSocket examples
    throw new Error('WebSocket implementation needed');
  }

  connectOrderUpdatesWebSocket(): WebSocket {
    // WebSocket implementation for order updates would go here
    throw new Error('WebSocket implementation needed');
  }
}

// Export the class and types
export default FilamentTrader;