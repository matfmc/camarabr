#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { iniciarHttp } from "./http.js";
import { criarServidor } from "./servidor.js";

// Padrão: stdio (plugin do Claude Code). Com --http ou MCP_TRANSPORT=http: servidor HTTP para hospedar.
if (process.argv.includes("--http") || process.env.MCP_TRANSPORT === "http") {
  iniciarHttp(Number(process.env.PORT ?? 3000), process.env.HOST ?? "0.0.0.0");
} else {
  await criarServidor().connect(new StdioServerTransport());
}
