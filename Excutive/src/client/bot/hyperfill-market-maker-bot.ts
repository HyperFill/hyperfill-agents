#!/usr/bin/env ts-node

import { EventEmitter } from 'events';
import HyperFillClient from '../../services/HyperFillClient.js';

interface Order {
  id: number;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  price: number;
  status: 'pending' | 'filled' | 'cancelled';
  timestamp: number;
}

interface Balance {
  [asset: string]: number;
}

interface MarketData {
  symbol: string;
  bestBid: number | null;
  bestAsk: number | null;
  spread: number | null;
  timestamp: number;
}

class HyperFillMarketMaker extends EventEmitter {
  private hyperFillClient: HyperFillClient;
  private symbol: string;
  private spread: number;
  private orderAmount: number;
  private isRunning: boolean = false;
  private activeOrders: Map<string, Order> = new Map();
  private balance: Balance = {};

  constructor(
    symbol: string,
    spread: number = 0.002,
    orderAmount: number = 0.01,
    baseUrl: string = "http://localhost:8000"
  ) {
    super();
    this.hyperFillClient = new HyperFillClient(baseUrl);
    this.symbol = symbol;
    this.spread = spread;
    this.orderAmount = orderAmount;
  }

  async start() {
    console.log(`Starting HyperFill market maker for ${this.symbol}`);
    this.isRunning = true;

    try {
      await this.hyperFillClient.healthCheck();
      console.log('Connected to HyperFill API');
    } catch (error) {
      console.error('Failed to connect to HyperFill API:', error);
      return;
    }

    this.startMarketMaking();
  }

  private async startMarketMaking() {
    while (this.isRunning) {
      try {
        await this.updateOrders();
        await this.sleep(5000); // Update every 5 seconds
      } catch (error) {
        console.error('Error in market making loop:', error);
        await this.sleep(10000); // Wait longer on error
      }
    }
  }

  private async updateOrders() {
    try {
      const orderbook = await this.hyperFillClient.getOrderbook(this.symbol);
      
      if (!orderbook) {
        console.log('No orderbook data available');
        return;
      }

      const { bestBid, bestAsk, spread } = orderbook;
      
      if (bestBid === null || bestAsk === null) {
        await this.placeInitialOrders();
        return;
      }

      const midPrice = (bestBid + bestAsk) / 2;
      const targetBidPrice = midPrice * (1 - this.spread / 2);
      const targetAskPrice = midPrice * (1 + this.spread / 2);

      console.log(`Market: ${this.symbol} | Mid: ${midPrice.toFixed(6)} | Spread: ${spread?.toFixed(2)}%`);

      await this.manageOrders(targetBidPrice, targetAskPrice);

    } catch (error) {
      console.error('Error updating orders:', error);
    }
  }

  private async placeInitialOrders() {
    console.log('Placing initial orders to bootstrap market');
    
    const basePrice = 1.0; // Default starting price
    const bidPrice = basePrice * (1 - this.spread / 2);
    const askPrice = basePrice * (1 + this.spread / 2);

    await this.placeBuyOrder(bidPrice);
    await this.placeSellOrder(askPrice);
  }

  private async manageOrders(targetBidPrice: number, targetAskPrice: number) {
    const currentBuyOrders = Array.from(this.activeOrders.values()).filter(o => o.side === 'buy');
    const currentSellOrders = Array.from(this.activeOrders.values()).filter(o => o.side === 'sell');

    if (currentBuyOrders.length === 0) {
      await this.placeBuyOrder(targetBidPrice);
    } else {
      const buyOrder = currentBuyOrders[0];
      if (Math.abs(buyOrder.price - targetBidPrice) / targetBidPrice > 0.001) {
        await this.cancelOrder(buyOrder.id.toString(), this.symbol, 'bid');
        await this.placeBuyOrder(targetBidPrice);
      }
    }

    if (currentSellOrders.length === 0) {
      await this.placeSellOrder(targetAskPrice);
    } else {
      const sellOrder = currentSellOrders[0];
      if (Math.abs(sellOrder.price - targetAskPrice) / targetAskPrice > 0.001) {
        await this.cancelOrder(sellOrder.id.toString(), this.symbol, 'ask');
        await this.placeSellOrder(targetAskPrice);
      }
    }
  }

  private async placeBuyOrder(price: number) {
    try {
      const result = await this.hyperFillClient.placeLimitOrder(
        this.symbol,
        true,
        price.toString(),
        this.orderAmount
      );

      if (result.success && result.orderId) {
        const order: Order = {
          id: result.orderId,
          symbol: this.symbol,
          side: 'buy',
          quantity: this.orderAmount,
          price,
          status: 'pending',
          timestamp: Date.now()
        };
        
        this.activeOrders.set(result.orderId.toString(), order);
        console.log(`Placed buy order: ${this.orderAmount} ${this.symbol} @ ${price.toFixed(6)}`);
        
        if (result.trades && result.trades.length > 0) {
          console.log(`Order executed with ${result.trades.length} trades`);
          order.status = 'filled';
          this.emit('orderFilled', order);
        }
      } else {
        console.error('Failed to place buy order:', result.message);
      }
    } catch (error) {
      console.error('Error placing buy order:', error);
    }
  }

  private async placeSellOrder(price: number) {
    try {
      const result = await this.hyperFillClient.placeLimitOrder(
        this.symbol,
        false,
        price.toString(),
        this.orderAmount
      );

      if (result.success && result.orderId) {
        const order: Order = {
          id: result.orderId,
          symbol: this.symbol,
          side: 'sell',
          quantity: this.orderAmount,
          price,
          status: 'pending',
          timestamp: Date.now()
        };
        
        this.activeOrders.set(result.orderId.toString(), order);
        console.log(`Placed sell order: ${this.orderAmount} ${this.symbol} @ ${price.toFixed(6)}`);
        
        if (result.trades && result.trades.length > 0) {
          console.log(`Order executed with ${result.trades.length} trades`);
          order.status = 'filled';
          this.emit('orderFilled', order);
        }
      } else {
        console.error('Failed to place sell order:', result.message);
      }
    } catch (error) {
      console.error('Error placing sell order:', error);
    }
  }

  private async cancelOrder(orderId: string, asset: string, side: string) {
    try {
      const result = await this.hyperFillClient.cancelOrder(orderId, asset, side);
      
      if (result.success) {
        this.activeOrders.delete(orderId);
        console.log(`Cancelled order: ${orderId}`);
      } else {
        console.error('Failed to cancel order:', result.message);
      }
    } catch (error) {
      console.error('Error cancelling order:', error);
    }
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  stop() {
    console.log('Stopping HyperFill market maker');
    this.isRunning = false;
  }

  getActiveOrders(): Order[] {
    return Array.from(this.activeOrders.values());
  }

  getBalance(): Balance {
    return { ...this.balance };
  }
}

class HyperFillTradingBot {
  private marketMakers: HyperFillMarketMaker[] = [];

  addMarketMaker(symbol: string, spread: number = 0.002, orderAmount: number = 0.01): HyperFillMarketMaker {
    const marketMaker = new HyperFillMarketMaker(symbol, spread, orderAmount);
    this.marketMakers.push(marketMaker);
    
    marketMaker.on('orderFilled', (order: Order) => {
      console.log(`Order filled: ${order.side} ${order.quantity} ${order.symbol} @ ${order.price}`);
    });
    
    return marketMaker;
  }

  async start() {
    console.log('HyperFill Trading Bot Starting...');
    console.log('=================================');

    for (const marketMaker of this.marketMakers) {
      await marketMaker.start();
    }

    process.on('SIGINT', () => {
      console.log('\nShutting down HyperFill Trading Bot...');
      this.marketMakers.forEach(mm => mm.stop());
      process.exit(0);
    });
  }

  getMarketMakers(): HyperFillMarketMaker[] {
    return this.marketMakers;
  }
}

async function main() {
  const bot = new HyperFillTradingBot();
  
  bot.addMarketMaker('SEI/USDT', 0.001, 1.0); // 0.1% spread, 1.0 SEI orders
  
  await bot.start();
}

if (require.main === module) {
  main().catch(console.error);
}

export { HyperFillTradingBot, HyperFillMarketMaker };