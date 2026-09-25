// Modo HTTP (Streamable HTTP, sem sessão): permite hospedar o servidor e usá-lo como conector
// personalizado no claude.ai. Cada requisição POST /mcp ganha um servidor e um transporte novos.
import { createServer, type ServerResponse } from "node:http";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { definirDicaCorte } from "./formato.js";
import { criarServidor, VERSAO } from "./servidor.js";

function erroJsonRpc(res: ServerResponse, status: number, mensagem: string, cabecalhos: Record<string, string> = {}) {
  res
    .writeHead(status, { "content-type": "application/json", ...cabecalhos })
    .end(JSON.stringify({ jsonrpc: "2.0", error: { code: -32000, message: mensagem }, id: null }));
}

export function iniciarHttp(porta: number, host: string) {
  definirDicaCorte("ou divida a consulta em períodos ou filtros menores");

  const http = createServer(async (req, res) => {
    const { pathname } = new URL(req.url ?? "/", "http://localhost");

    if (pathname === "/" || pathname === "/saude") {
      res
        .writeHead(200, { "content-type": "text/plain; charset=utf-8" })
        .end(`CamaraBR MCP ${VERSAO}. Endpoint MCP: /mcp\n`);
      return;
    }
    if (pathname !== "/mcp") {
      res.writeHead(404, { "content-type": "text/plain; charset=utf-8" }).end("Não encontrado. Use /mcp\n");
      return;
    }
    // Sem sessão não há fluxo SSE para GET nem sessão para DELETE.
    if (req.method !== "POST") {
      erroJsonRpc(res, 405, "Método não permitido. Use POST.", { allow: "POST" });
      return;
    }

    const server = criarServidor({ remoto: true });
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
    res.on("close", () => {
      transport.close();
      server.close();
    });
    try {
      await server.connect(transport);
      await transport.handleRequest(req, res);
    } catch (e) {
      console.error("Erro ao tratar requisição MCP:", e);
      if (!res.headersSent) erroJsonRpc(res, 500, "Erro interno do servidor");
    }
  });

  http.listen(porta, host, () => {
    const endereco = http.address();
    const p = typeof endereco === "object" && endereco ? endereco.port : porta;
    console.error(`CamaraBR MCP ${VERSAO} ouvindo em http://${host}:${p}/mcp`);
  });

  const encerrar = () => http.close(() => process.exit(0));
  process.on("SIGINT", encerrar);
  process.on("SIGTERM", encerrar);
}
