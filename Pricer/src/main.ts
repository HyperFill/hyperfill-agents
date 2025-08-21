// import { getSeiUsdtPrice } from "./client/descreener-price-oracle-client";
import { getMidPriceGate } from "./client/price-oracle-client";
import { fetchMcpSeiClient } from "./client/MCPSSEClient";
import PricerApp from "./server/server"
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const hyperfillAbi = [
    {
        "inputs": [],
        "name": "totalSupply",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    }
]

async function main() {
    const mcp_servers = [PricerApp]
    mcp_servers.map((server, index) => {
        let port = (index + 3) * 1000
        server.listen(port, () => {

            try {

                // clientCallTest()
                // example()
                fetchMcpSeiClient().then(async (client) => {
                    // List tools
                    const tools = await client.listTools();


                    // Call a tool
                    const result = await client.callTool({
                        name: "read_contract",
                        arguments: {
                            contractAddress: "0xbaC8D6A511A673fCE111D8c14c760aDE68116558",
                            abi: hyperfillAbi,
                            functionName: "totalSupply",
                            args: [],
                            network: "sei-testnet",

                        }
                    });
                    console.log(result, "TOOLS")

                    // const p = await getSeiUsdtPrice();
                    const j = await getMidPriceGate({ quote: "USDT", base: "SEI" })
                    // if (!p) {
                    //     console.log("SEI/USDT pair not found on DexScreener (sei).");
                    //     return;
                    // }
                    // console.log("SEI/USDT price USD:", p.priceUsd);
                    // console.log("priceNative:", p.priceNative);
                    // console.log("pairAddress:", p.pairAddress);
                    console.log("dexId:", j);
                })


            } catch (err) {
                console.log(JSON.stringify(err), "ERRRR")
            }
            console.log(server.get("name") + " MCP server listening on :" + port)
        })
    })
}

main().then(res => console.log("happening...", res)).catch(err => {
    console.log(err)
})