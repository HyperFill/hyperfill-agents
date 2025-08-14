import AnalyzerApp from "./servers/analyzer_server"
import ExecuterApp from "./servers/executer_server"
import InventoryApp from "./servers/inventory_server"
import PricerApp from "./servers/pricer_server"




async function main() {
    const mcp_servers = [AnalyzerApp, ExecuterApp, InventoryApp, PricerApp]
    mcp_servers.map((server, index) => {
        let port = (index + 1) * 1000
        server.listen(port, () => console.log(server.get("name") + " MCP server listening on :" + port))
    })
}

main().then(res => console.log("happening...", res)).catch(err => {
    console.log(err)
})