#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registrarFerramentas } from "./ferramentas.js";

const server = new McpServer(
  { name: "camara", version: "0.1.0" },
  {
    instructions:
      "Ferramentas para a API de Dados Abertos da Câmara dos Deputados (Brasil). " +
      "Fluxo típico: buscar_deputados / buscar_proposicoes para achar ids, depois perfil_deputado, " +
      "despesas_deputado, dossie_proposicao ou resultado_votacao. consultar_api cobre qualquer outro endpoint " +
      "e exportar_dados salva listas grandes em CSV/JSON. Cite sempre a fonte (dadosabertos.camara.leg.br).",
  },
);

registrarFerramentas(server);

await server.connect(new StdioServerTransport());
