import HyperFillMMClient from "../market_clients/hyper-fillmm-client.js";
import { config } from "./config.js";
export class MarketManager {
    constructor() {
        this._supportedMarkets = [];
        this._marketList = [
            {
                marketName: "hyperfill",
                id: "123"
            }
        ];
    }
    getMarketList() {
        return this._marketList;
    }
    getMarketClient(marketName) {
        let client;
        for (let market of this._marketList) {
            if (market.marketName == marketName) {
                const marketConfig = {
                    baseUrl: process.env.MARKET_BASE_URL || "http://localhost:3000",
                    privateKey: config.privateKey,
                    simulationMode: process.env.SIMULATION_MODE !== 'false',
                    account: config.account
                };
                client = new HyperFillMMClient(marketConfig);
            }
        }
        return client;
    }
}
