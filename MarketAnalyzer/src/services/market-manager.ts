import HyperFillMMClient, { AssetInfo, HyperFillConfig } from "../market_clients/hyper-fillmm-client.js"
import { config } from "./config.js"



interface IMarket {
    marketName: string,
    id: string,
}
export class MarketManager {
    constructor() {

    }

    _supportedMarkets = [

    ]

    _marketList: IMarket[] = [
        {
            marketName: "hyperfill",
            id: "123"
        }
    ]

    getMarketList() {
        return this._marketList
    }

    getMarketClient(marketName: string): HyperFillMMClient | undefined {
        let client;
        for (let market of this._marketList) {
            if (market.marketName == marketName) {

                const marketConfig: HyperFillConfig = {
                    baseUrl: process.env.MARKET_BASE_URL || "http://localhost:3000",
                    privateKey: config.privateKey,
                    simulationMode: process.env.SIMULATION_MODE !== 'false',
                    account: config.account
                }
                client = new HyperFillMMClient(marketConfig)
            }

        }

        return client
    }

    // async fetchMarketAssets(marketName: string): Promise<AssetInfo[] | []> {
    //     const client = this.getMarketClient(marketName)
    //     if (client)
    //         return await client?.fetchAssets()

    //     else
    //         return []
    // }

    // async fetchMarketAsset(symbol: string): Promise<AssetInfo | undefined> {
    //     const client = this.getMarketClient(symbol)
    //     if (client)
    //         return await client.getAsset(symbol)
    // }
}