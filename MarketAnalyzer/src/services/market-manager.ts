import HyperFillMMClient, { AssetInfo, HyperFillConfig } from "../market_clients/hyper-fillmm-client"



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

                let config: HyperFillConfig = {
                    baseUrl: "http://localhost:3000",
                    privateKey: "0x",
                    simulationMode: true,
                    account: "1"
                }
                client = new HyperFillMMClient(config)
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