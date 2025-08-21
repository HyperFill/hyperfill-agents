#!/usr/bin/env ts-node

import { EventEmitter } from 'events';

// Types and Interfaces
interface OrderBook {
  bids: [number, number][]; // [price, quantity]
  asks: [number, number][];
  timestamp: number;
}

interface Order {
  id: string;
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
  price: number;
  volume: number;
  timestamp: number;
}

// Mock Exchange Connector
class MockExchange extends EventEmitter {
  private balance: Balance = {
    'USDT': 1000,
    'SEI': 300,
    'ETH': 1.0
  };
  
  private orderBook: { [symbol: string]: OrderBook } = {
    'SEI/USDT': {
      bids: [[0.3, 1], [1, 0.2], [0.3, 1]],
      asks: [[0.4, 1.1], [0.4, 1.2], [0.5, 1.3]],
      timestamp: Date.now()
    }
  };

  private orders: Order[] = [];

  async getBalance(): Promise<Balance> {
    return { ...this.balance };
  }

  async getOrderBook(symbol: string): Promise<OrderBook> {
    return this.orderBook[symbol] || { bids: [], asks: [], timestamp: Date.now() };
  }

  async placeOrder(symbol: string, side: 'buy' | 'sell', quantity: number, price: number): Promise<Order> {
    const order: Order = {
      id: Math.random().toString(36).substring(7),
      symbol,
      side,
      quantity,
      price,
      status: 'pending',
      timestamp: Date.now()
    };

    this.orders.push(order);
    
    // Simulate order execution after a delay
    setTimeout(() => {
      this.executeOrder(order);
    }, Math.random() * 2000 + 500);

    return order;
  }

  private executeOrder(order: Order) {
    const [baseAsset, quoteAsset] = order.symbol.split('/');
    const cost = order.price * order.quantity;

    if (order.side === 'buy') {
      if (this.balance[quoteAsset] >= cost) {
        this.balance[quoteAsset] -= cost;
        this.balance[baseAsset] = (this.balance[baseAsset] || 0) + order.quantity;
        order.status = 'filled';
        this.emit('orderFilled', order);
      } else {
        order.status = 'cancelled';
        this.emit('orderCancelled', order);
      }
    } else {
      if (this.balance[baseAsset] >= order.quantity) {
        this.balance[baseAsset] -= order.quantity;
        this.balance[quoteAsset] = (this.balance[quoteAsset] || 0) + cost;
        order.status = 'filled';
        this.emit('orderFilled', order);
      } else {
        order.status = 'cancelled';
        this.emit('orderCancelled', order);
      }
    }
  }

  // Simulate price updates
  startPriceUpdates(symbol: string) {
    setInterval(() => {
      const orderBook = this.orderBook[symbol];
      if (orderBook) {
        // Add some randomness to prices
        const priceChange = (Math.random() - 0.5) * 100;
        orderBook.bids = orderBook.bids.map(([price, qty]) => [price + priceChange, qty]);
        orderBook.asks = orderBook.asks.map(([price, qty]) => [price + priceChange, qty]);
        orderBook.timestamp = Date.now();
        
        const marketData: MarketData = {
          symbol,
          price: (orderBook.bids[0][0] + orderBook.asks[0][0]) / 2,
          volume: 0,
          timestamp: Date.now()
        };
        
        this.emit('marketData', marketData);
      }
    }, 1000);
  }
}

// Simple Market Making Strategy
class SimpleMarketMaker {
  private exchange: MockExchange;
  private symbol: string;
  private spread: number;
  private orderAmount: number;
  private isRunning: boolean = false;

  constructor(exchange: MockExchange, symbol: string, spread: number = 0.002, orderAmount: number = 0.01) {
    this.exchange = exchange;
    this.symbol = symbol;
    this.spread = spread;
    this.orderAmount = orderAmount;
  }

  async start() {
    console.log(`🚀 Starting market maker for ${this.symbol}`);
    this.isRunning = true;

    // Listen for market data updates
    this.exchange.on('marketData', (data: MarketData) => {
      if (data.symbol === this.symbol && this.isRunning) {
        this.updateOrders(data.price);
      }
    });

    // Listen for order events
    this.exchange.on('orderFilled', (order: Order) => {
      console.log(`✅ Order filled: ${order.side} ${order.quantity} ${order.symbol} @ ${order.price}`);
    });

    this.exchange.on('orderCancelled', (order: Order) => {
      console.log(`❌ Order cancelled: ${order.side} ${order.quantity} ${order.symbol} @ ${order.price}`);
    });

    // Start price updates
    this.exchange.startPriceUpdates(this.symbol);
  }

  private async updateOrders(currentPrice: number) {
    try {
      const balance = await this.exchange.getBalance();
      const [baseAsset, quoteAsset] = this.symbol.split('/');
      
      // Calculate bid and ask prices
      const bidPrice = currentPrice * (1 - this.spread / 2);
      const askPrice = currentPrice * (1 + this.spread / 2);

      // Place buy order if we have quote asset
      if (balance[quoteAsset] >= bidPrice * this.orderAmount) {
        await this.exchange.placeOrder(this.symbol, 'buy', this.orderAmount, bidPrice);
        console.log(`📈 Placed buy order: ${this.orderAmount} ${this.symbol} @ ${bidPrice.toFixed(2)}`);
      }

      // Place sell order if we have base asset
      if (balance[baseAsset] >= this.orderAmount) {
        await this.exchange.placeOrder(this.symbol, 'sell', this.orderAmount, askPrice);
        console.log(`📉 Placed sell order: ${this.orderAmount} ${this.symbol} @ ${askPrice.toFixed(2)}`);
      }

      // Log current balance
      console.log(`💰 Balance: ${Object.entries(balance).map(([asset, amount]) => `${asset}: ${amount.toFixed(4)}`).join(', ')}`);
      
    } catch (error) {
      console.error('❌ Error updating orders:', error);
    }
  }

  stop() {
    console.log('🛑 Stopping market maker');
    this.isRunning = false;
  }
}

// Main Bot Class
class TradingBot {
  private exchange: MockExchange;
  private strategies: SimpleMarketMaker[] = [];

  constructor() {
    this.exchange = new MockExchange();
  }

  addStrategy(symbol: string, spread: number = 0.002, orderAmount: number = 0.01) {
    const strategy = new SimpleMarketMaker(this.exchange, symbol, spread, orderAmount);
    this.strategies.push(strategy);
    return strategy;
  }

  async start() {
    console.log('🤖 Trading Bot Starting...');
    console.log('========================');

    // Display initial balance
    const balance = await this.exchange.getBalance();
    console.log('💰 Initial Balance:');
    Object.entries(balance).forEach(([asset, amount]) => {
      console.log(`   ${asset}: ${amount}`);
    });
    console.log('========================');

    // Start all strategies
    for (const strategy of this.strategies) {
      await strategy.start();
    }

    // Setup graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n📊 Final Balance:');
      this.exchange.getBalance().then(balance => {
        Object.entries(balance).forEach(([asset, amount]) => {
          console.log(`   ${asset}: ${amount.toFixed(4)}`);
        });
        process.exit(0);
      });
    });
  }
}

// Usage Example
async function main() {
  const bot = new TradingBot();
  
  // Add a market making strategy for SEI/USDT
  bot.addStrategy('SEI/USDT', 0.001, 0.005); // 0.1% spread, 0.005 SEI orders
  
  // Start the bot
  await bot.start();
}

// Run the bot if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}

export { TradingBot, SimpleMarketMaker, MockExchange };