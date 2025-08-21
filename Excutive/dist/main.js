import Executive from "./server/server.js";
async function main() {
    const mcp_servers = [Executive];
    mcp_servers.map((server, index) => {
        let port = 1000 + index;
        server.listen(port, () => console.log(server.get("name") + " MCP server listening on :" + port));
    });
}
main().then(res => console.log("happening...", res)).catch(err => {
    console.log(err);
});
