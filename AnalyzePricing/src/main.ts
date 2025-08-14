import AnalyzerApp from "./server/server"

async function main() {
    const mcp_servers = [AnalyzerApp]
    mcp_servers.map((server, index) => {
        let port = (index + 1) * 1000
        server.listen(port, () => console.log(server.get("name") + " MCP server listening on :" + port))
    })
}

main().then(res => console.log("happening...", res)).catch(err => {
    console.log(err)
})