import HyperFillMMClient, { HyperFillConfig } from "../client/hyper-fillmm-client"



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
            id: "1"
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
                    baseUrl: "http://localhost:8000",
                    privateKey: process.env.PRIVATE_KEY || "",
                    account: process.env.ACCOUNT_ADDRESS || ""
                }
                client = new HyperFillMMClient(config)
            }

        }

        return client
    }
}