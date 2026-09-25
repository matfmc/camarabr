import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registrarExportacao, registrarFerramentas } from "./ferramentas.js";

export const VERSAO = "0.2.0";

/**
 * Monta o servidor MCP. No modo remoto (HTTP) fica de fora exportar_dados, que gravaria arquivos
 * no disco do servidor, e não no computador de quem pergunta.
 */
export function criarServidor({ remoto = false } = {}) {
  const server = new McpServer(
    { name: "camara", version: VERSAO },
    {
      instructions:
        "Ferramentas para a API de Dados Abertos da Câmara dos Deputados (Brasil). " +
        "Fluxo típico: buscar_deputados / buscar_proposicoes para achar ids, depois perfil_deputado, " +
        "despesas_deputado, dossie_proposicao ou resultado_votacao. consultar_api cobre qualquer outro endpoint" +
        (remoto ? ". " : " e exportar_dados salva listas grandes em CSV/JSON. ") +
        "Cite sempre a fonte (dadosabertos.camara.leg.br).",
    },
  );
  registrarFerramentas(server);
  if (!remoto) registrarExportacao(server);
  return server;
}
