import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  corrigirParametrosDespesas,
  legislaturaAtual,
  legislaturasDoAno,
  MAX_ITENS_ABSOLUTO,
  obter,
  obterTodos,
  type Parametros,
} from "./api.js";
import { arredondar, paraCsv, resolverCaminho, respostaErro, respostaJson, salvarArquivo, somar } from "./formato.js";

const SOMENTE_LEITURA = { readOnlyHint: true, openWorldHint: true } as const;

const data = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use o formato AAAA-MM-DD");
const parametrosLivres = z
  .record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.array(z.union([z.string(), z.number()]))]))
  .optional()
  .describe("Parâmetros de query string, ex.: {\"siglaUf\": \"SP\", \"ano\": 2025}. Listas viram valores separados por vírgula.");

/** Executa uma ou mais consultas paginadas (ex.: despesas em duas legislaturas) e junta os resultados. */
async function consultarPaginado(caminho: string, params: Parametros, maxItens: number) {
  const variantes = corrigirParametrosDespesas(caminho, params);
  const partes = [];
  let restante = maxItens;
  for (const p of variantes) {
    if (restante <= 0) break;
    const r = await obterTodos(caminho, p, restante);
    partes.push(r);
    restante -= r.dados.length;
  }
  return {
    dados: partes.flatMap((p) => p.dados),
    total: partes.every((p) => p.total !== null) ? partes.reduce((s, p) => s + (p.total ?? 0), 0) : null,
    truncado: partes.some((p) => p.truncado),
    parametrosUsados: variantes,
  };
}

async function talvez<T>(promessa: Promise<T>): Promise<T | { erro: string }> {
  try {
    return await promessa;
  } catch (e) {
    return { erro: e instanceof Error ? e.message : String(e) };
  }
}

export function registrarFerramentas(server: McpServer) {
  // ---------------------------------------------------------------- genérica
  server.registerTool(
    "consultar_api",
    {
      title: "Consultar API da Câmara",
      description:
        "Faz um GET em qualquer endpoint da API de Dados Abertos da Câmara (https://dadosabertos.camara.leg.br/api/v2). " +
        "Use quando nenhuma ferramenta específica cobrir o caso. Exemplos de caminho: 'deputados/204379/discursos', " +
        "'orgaos', 'eventos/82965/pauta', 'frentes/54012/membros', 'partidos'. " +
        "Para listas, pagina automaticamente até max_itens. Datas em AAAA-MM-DD. " +
        "Obs.: /deputados/{id}/despesas exige idLegislatura (preenchido automaticamente).",
      inputSchema: {
        caminho: z.string().describe("Caminho relativo à base da API, ex.: 'deputados/204379/orgaos'"),
        parametros: parametrosLivres,
        paginar: z.boolean().default(true).describe("Se true, junta várias páginas até max_itens"),
        max_itens: z.number().int().min(1).max(5000).default(200),
      },
      annotations: SOMENTE_LEITURA,
    },
    async ({ caminho, parametros = {}, paginar, max_itens }) => {
      try {
        if (!paginar) return respostaJson(await obter(caminho, parametros));
        // Recursos únicos (ex.: deputados/{id}) não são listas: devolve direto.
        const primeira = await obter(caminho, { ...parametros, itens: 1 });
        if (!Array.isArray(primeira)) return respostaJson(primeira);
        const r = await consultarPaginado(caminho, parametros, max_itens);
        return respostaJson({
          total_na_api: r.total,
          retornados: r.dados.length,
          truncado: r.truncado,
          dados: r.dados,
        });
      } catch (e) {
        return respostaErro(e);
      }
    },
  );

  // ---------------------------------------------------------------- deputados
  server.registerTool(
    "buscar_deputados",
    {
      title: "Buscar deputados",
      description:
        "Lista deputados por nome, UF, partido, sexo ou legislatura. Sem legislatura/datas, traz apenas os em exercício agora. " +
        "Devolve id (use nas outras ferramentas), nome, partido, UF e e-mail.",
      inputSchema: {
        nome: z.string().optional().describe("Parte do nome parlamentar (sem acento funciona)"),
        siglaUf: z.array(z.string().length(2)).optional(),
        siglaPartido: z.array(z.string()).optional(),
        siglaSexo: z.enum(["M", "F"]).optional(),
        idLegislatura: z.number().int().optional().describe(`Legislatura (atual: ${legislaturaAtual()})`),
        max_itens: z.number().int().min(1).max(1000).default(600),
      },
      annotations: SOMENTE_LEITURA,
    },
    async ({ max_itens, ...filtros }) => {
      try {
        const r = await obterTodos("deputados", { ...filtros, ordem: "ASC", ordenarPor: "nome" }, max_itens);
        const dados = r.dados.map(({ id, nome, siglaPartido, siglaUf, idLegislatura, email }) => ({
          id, nome, siglaPartido, siglaUf, idLegislatura, email,
        }));
        return respostaJson({ total: r.total, truncado: r.truncado, dados });
      } catch (e) {
        return respostaErro(e);
      }
    },
  );

  server.registerTool(
    "perfil_deputado",
    {
      title: "Perfil de deputado",
      description:
        "Dossiê de um deputado: dados pessoais e de mandato, gabinete, redes sociais, órgãos/comissões de que participa, " +
        "frentes parlamentares, profissões, ocupações e outros mandatos eletivos.",
      inputSchema: {
        id: z.number().int().describe("id do deputado (use buscar_deputados para descobrir)"),
      },
      annotations: SOMENTE_LEITURA,
    },
    async ({ id }) => {
      try {
        const hoje = new Date().toISOString().slice(0, 10);
        const [detalhes, orgaos, frentes, profissoes, ocupacoes, mandatosExternos] = await Promise.all([
          obter(`deputados/${id}`),
          talvez(obterTodos(`deputados/${id}/orgaos`, { dataInicio: hoje, dataFim: hoje }, 200).then((r) => r.dados)),
          talvez(obter(`deputados/${id}/frentes`)),
          talvez(obter(`deputados/${id}/profissoes`)),
          talvez(obter(`deputados/${id}/ocupacoes`)),
          talvez(obter(`deputados/${id}/mandatosExternos`)),
        ]);
        const resumirOrgao = (o: any) => ({ idOrgao: o.idOrgao, sigla: o.siglaOrgao, nome: o.nomeOrgao, cargo: o.titulo, desde: o.dataInicio });
        return respostaJson({
          detalhes,
          orgaos_atuais: Array.isArray(orgaos) ? orgaos.map(resumirOrgao) : orgaos,
          frentes: Array.isArray(frentes) ? frentes.map((f: any) => ({ id: f.id, titulo: f.titulo })) : frentes,
          profissoes,
          ocupacoes,
          mandatosExternos,
        });
      } catch (e) {
        return respostaErro(e);
      }
    },
  );

  server.registerTool(
    "despesas_deputado",
    {
      title: "Despesas da cota parlamentar (CEAP)",
      description:
        "Busca TODAS as despesas da Cota para o Exercício da Atividade Parlamentar de um deputado no período e devolve " +
        "totais já calculados: total geral, por tipo de despesa, por mês e maiores fornecedores. " +
        "Sem ano, usa a legislatura atual inteira. Valores em R$ (valorLiquido = valor efetivamente reembolsado).",
      inputSchema: {
        id: z.number().int(),
        ano: z.number().int().optional(),
        mes: z.array(z.number().int().min(1).max(12)).optional(),
        idLegislatura: z.number().int().optional(),
        cnpjCpfFornecedor: z.string().optional(),
        top_fornecedores: z.number().int().min(1).max(100).default(15),
        incluir_notas: z.boolean().default(false).describe("Se true, inclui a lista de notas (pode ser grande)"),
      },
      annotations: SOMENTE_LEITURA,
    },
    async ({ id, top_fornecedores, incluir_notas, ...filtros }) => {
      try {
        const r = await consultarPaginado(`deputados/${id}/despesas`, filtros, MAX_ITENS_ABSOLUTO);
        const notas = r.dados;
        const valor = (n: any) => Number(n.valorLiquido) || 0;
        const total = arredondar(notas.reduce((s, n) => s + valor(n), 0));
        const porMes = somar(notas, (n) => `${n.ano}-${String(n.mes).padStart(2, "0")}`, valor).sort((a, b) =>
          a.nome.localeCompare(b.nome),
        );
        const fornecedores = somar(notas, (n) => `${n.nomeFornecedor} (${n.cnpjCpfFornecedor || "s/ doc"})`, valor);
        return respostaJson({
          deputado: id,
          filtros: r.parametrosUsados,
          quantidade_notas: notas.length,
          total_liquido: total,
          total_glosado: arredondar(notas.reduce((s, n) => s + (Number(n.valorGlosa) || 0), 0)),
          por_tipo: somar(notas, (n) => n.tipoDespesa, valor),
          por_mes: porMes,
          top_fornecedores: fornecedores.slice(0, top_fornecedores),
          quantidade_fornecedores: fornecedores.length,
          notas: incluir_notas
            ? notas.map((n) => ({
                data: n.dataDocumento?.slice(0, 10), tipo: n.tipoDespesa, fornecedor: n.nomeFornecedor,
                cnpjCpf: n.cnpjCpfFornecedor, valorLiquido: n.valorLiquido, url: n.urlDocumento,
              }))
            : undefined,
        });
      } catch (e) {
        return respostaErro(e);
      }
    },
  );

  // ---------------------------------------------------------------- proposições
  server.registerTool(
    "buscar_proposicoes",
    {
      title: "Buscar proposições",
      description:
        "Busca proposições (PL, PEC, PLP, MPV, REQ, PDL...). ATENÇÃO: sem nenhum filtro de data/ano/número, a API só " +
        "devolve proposições que tramitaram nos últimos 30 dias. Para achar um projeto específico informe siglaTipo+numero+ano. " +
        "Para temas, use keywords (ex.: 'inteligência artificial') e/ou codTema (veja listar_referencias tipo=proposicoes/codTema).",
      inputSchema: {
        siglaTipo: z.array(z.string()).optional().describe("Ex.: ['PL','PEC']"),
        numero: z.number().int().optional(),
        ano: z.array(z.number().int()).optional().describe("Ano de apresentação"),
        keywords: z.string().optional().describe("Palavras-chave na ementa/indexação"),
        idDeputadoAutor: z.number().int().optional(),
        autor: z.string().optional().describe("Nome (ou parte) do autor"),
        siglaPartidoAutor: z.string().optional(),
        siglaUfAutor: z.string().optional(),
        codTema: z.array(z.number().int()).optional(),
        codSituacao: z.array(z.number().int()).optional(),
        dataApresentacaoInicio: data.optional(),
        dataApresentacaoFim: data.optional(),
        dataInicio: data.optional().describe("Início do período de tramitação"),
        dataFim: data.optional().describe("Fim do período de tramitação"),
        max_itens: z.number().int().min(1).max(2000).default(100),
      },
      annotations: SOMENTE_LEITURA,
    },
    async ({ max_itens, ...filtros }) => {
      try {
        const r = await obterTodos("proposicoes", { ...filtros, ordem: "DESC", ordenarPor: "id" }, max_itens);
        const dados = r.dados.map(({ id, siglaTipo, numero, ano, ementa, dataApresentacao }) => ({
          id, sigla: `${siglaTipo} ${numero}/${ano}`, ementa, dataApresentacao,
        }));
        return respostaJson({ total: r.total, truncado: r.truncado, dados });
      } catch (e) {
        return respostaErro(e);
      }
    },
  );

  server.registerTool(
    "dossie_proposicao",
    {
      title: "Dossiê de proposição",
      description:
        "Tudo sobre uma proposição: situação atual, ementa, autores, temas, histórico de tramitação, votações e " +
        "proposições relacionadas/apensadas. Informe id OU (siglaTipo + numero + ano).",
      inputSchema: {
        id: z.number().int().optional(),
        siglaTipo: z.string().optional(),
        numero: z.number().int().optional(),
        ano: z.number().int().optional(),
        max_tramitacoes: z.number().int().min(1).max(1000).default(40).describe("Quantas tramitações mais recentes incluir"),
        max_itens_listas: z.number().int().min(1).max(500).default(30).describe("Máximo de votações e de relacionadas listadas"),
      },
      annotations: SOMENTE_LEITURA,
    },
    async ({ id, siglaTipo, numero, ano, max_tramitacoes, max_itens_listas }) => {
      try {
        let pid = id;
        if (!pid) {
          if (!siglaTipo || !numero || !ano) throw new Error("Informe id ou siglaTipo + numero + ano.");
          const achadas = await obter("proposicoes", { siglaTipo, numero, ano });
          if (!Array.isArray(achadas) || achadas.length === 0) throw new Error(`${siglaTipo} ${numero}/${ano} não encontrada.`);
          pid = achadas[0].id;
        }
        const [detalhes, autores, temas, tramitacoes, votacoes, relacionadas] = await Promise.all([
          obter(`proposicoes/${pid}`),
          talvez(obter(`proposicoes/${pid}/autores`)),
          talvez(obter(`proposicoes/${pid}/temas`)),
          talvez(obter(`proposicoes/${pid}/tramitacoes`)),
          talvez(obter(`proposicoes/${pid}/votacoes`)),
          talvez(obter(`proposicoes/${pid}/relacionadas`)),
        ]);
        const tram = Array.isArray(tramitacoes) ? tramitacoes : [];
        const encurtar = (s: string | undefined, n = 240) => (s && s.length > n ? `${s.slice(0, n)}…` : s);
        const vots: any[] = Array.isArray(votacoes) ? votacoes : [];
        // Projetos grandes chegam a centenas de relacionadas (quase todas REQs): conta por tipo e lista só o que não é REQ.
        const rels: any[] = Array.isArray(relacionadas) ? relacionadas : [];
        const relsPorTipo: Record<string, number> = {};
        for (const p of rels) relsPorTipo[p.siglaTipo] = (relsPorTipo[p.siglaTipo] ?? 0) + 1;
        return respostaJson({
          detalhes,
          autores,
          temas: Array.isArray(temas) ? temas.map((t: any) => t.tema) : temas,
          tramitacoes: {
            total: tram.length,
            mais_recentes: tram
              .slice(-max_tramitacoes)
              .reverse()
              .map((t: any) => ({ data: t.dataHora, orgao: t.siglaOrgao, tramitacao: t.descricaoTramitacao, situacao: t.descricaoSituacao, despacho: t.despacho })),
          },
          votacoes: Array.isArray(votacoes)
            ? {
                total: vots.length,
                mais_recentes: vots
                  .slice()
                  .sort((a, b) => String(b.dataHoraRegistro ?? b.data).localeCompare(String(a.dataHoraRegistro ?? a.data)))
                  .slice(0, max_itens_listas)
                  .map((v) => ({ id: v.id, data: v.data, orgao: v.siglaOrgao, descricao: encurtar(v.descricao), aprovacao: v.aprovacao })),
              }
            : votacoes,
          relacionadas: Array.isArray(relacionadas)
            ? {
                total: rels.length,
                por_tipo: relsPorTipo,
                exceto_requerimentos: rels
                  .filter((p) => p.siglaTipo !== "REQ")
                  .slice(0, max_itens_listas)
                  .map((p) => ({ id: p.id, sigla: `${p.siglaTipo} ${p.numero}/${p.ano}`, ementa: encurtar(p.ementa) })),
                observacao: "Use consultar_api em proposicoes/{id}/relacionadas para a lista completa.",
              }
            : relacionadas,
        });
      } catch (e) {
        return respostaErro(e);
      }
    },
  );

  // ---------------------------------------------------------------- votações
  server.registerTool(
    "buscar_votacoes",
    {
      title: "Buscar votações",
      description:
        "Lista votações por proposição, órgão (Plenário = idOrgao 180) ou período. Sem filtros, traz os últimos 30 dias. " +
        "O intervalo entre dataInicio e dataFim deve ficar dentro do mesmo ano.",
      inputSchema: {
        idProposicao: z.number().int().optional(),
        idOrgao: z.number().int().optional().describe("180 = Plenário"),
        idEvento: z.number().int().optional(),
        dataInicio: data.optional(),
        dataFim: data.optional(),
        max_itens: z.number().int().min(1).max(2000).default(200),
      },
      annotations: SOMENTE_LEITURA,
    },
    async ({ max_itens, ...filtros }) => {
      try {
        const r = await obterTodos("votacoes", { ...filtros, ordem: "DESC", ordenarPor: "dataHoraRegistro" }, max_itens);
        const dados = r.dados.map(({ id, data: dia, siglaOrgao, descricao, aprovacao, proposicaoObjeto }) => ({
          id, data: dia, orgao: siglaOrgao, descricao, aprovacao, proposicaoObjeto,
        }));
        return respostaJson({ total: r.total, truncado: r.truncado, dados });
      } catch (e) {
        return respostaErro(e);
      }
    },
  );

  server.registerTool(
    "resultado_votacao",
    {
      title: "Resultado de votação",
      description:
        "Detalhes de uma votação com placar geral, placar por partido e por UF, orientação de cada bancada " +
        "e, opcionalmente, o voto de cada deputado. Votações simbólicas não têm votos individuais.",
      inputSchema: {
        id: z.string().describe("id da votação, ex.: '2611313-31'"),
        incluir_votos_individuais: z.boolean().default(false),
      },
      annotations: SOMENTE_LEITURA,
    },
    async ({ id, incluir_votos_individuais }) => {
      try {
        const [detalhes, orientacoes, votos] = await Promise.all([
          obter(`votacoes/${id}`),
          talvez(obter(`votacoes/${id}/orientacoes`)),
          talvez(obter(`votacoes/${id}/votos`)),
        ]);
        const lista: any[] = Array.isArray(votos) ? votos : [];
        // Nos votos, o deputado vem no campo "deputado_" (com sublinhado).
        const dep = (v: any) => v.deputado_ ?? v.deputado ?? {};
        const agrupar = (chave: (v: any) => string) => {
          const mapa: Record<string, Record<string, number>> = {};
          for (const v of lista) {
            const k = chave(v) || "?";
            mapa[k] ??= {};
            mapa[k][v.tipoVoto] = (mapa[k][v.tipoVoto] ?? 0) + 1;
          }
          return mapa;
        };
        const placar: Record<string, number> = {};
        for (const v of lista) placar[v.tipoVoto] = (placar[v.tipoVoto] ?? 0) + 1;
        return respostaJson({
          detalhes,
          nominal: lista.length > 0,
          placar,
          por_partido: agrupar((v) => dep(v).siglaPartido),
          por_uf: agrupar((v) => dep(v).siglaUf),
          orientacoes: Array.isArray(orientacoes)
            ? orientacoes
                .filter((o: any) => o.orientacaoVoto)
                .map((o: any) => ({ bancada: o.siglaPartidoBloco, orientacao: o.orientacaoVoto }))
            : orientacoes,
          votos: incluir_votos_individuais
            ? lista.map((v) => ({ id: dep(v).id, nome: dep(v).nome, partido: dep(v).siglaPartido, uf: dep(v).siglaUf, voto: v.tipoVoto }))
            : undefined,
        });
      } catch (e) {
        return respostaErro(e);
      }
    },
  );

  // ---------------------------------------------------------------- referências
  const REFERENCIAS = [
    "deputados/codSituacao", "deputados/codTipoProfissao", "deputados/siglaUF", "deputados/tipoDespesa",
    "eventos/codSituacaoEvento", "eventos/codTipoEvento",
    "orgaos/codSituacao", "orgaos/codTipoOrgao",
    "proposicoes/codSituacao", "proposicoes/codTema", "proposicoes/codTipoAutor",
    "proposicoes/codTipoTramitacao", "proposicoes/siglaTipo",
  ] as const;

  server.registerTool(
    "listar_referencias",
    {
      title: "Listar códigos de referência",
      description:
        "Valores válidos para filtros da API: tipos de proposição, códigos de tema, situações de tramitação, " +
        "tipos de despesa, tipos de evento/órgão etc. Use antes de filtrar por códigos.",
      inputSchema: {
        tipo: z.enum(REFERENCIAS),
        filtro: z.string().optional().describe("Texto para filtrar por sigla/nome (sem diferenciar acentos), ex.: 'emenda'"),
      },
      annotations: SOMENTE_LEITURA,
    },
    async ({ tipo, filtro }) => {
      try {
        const normalizar = (s: unknown) =>
          String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
        const itens: any[] = await obter(`referencias/${tipo}`);
        const alvo = filtro ? normalizar(filtro) : "";
        const filtrados = alvo
          ? itens.filter((i) => normalizar(`${i.sigla} ${i.nome} ${i.descricao}`).includes(alvo))
          : itens;
        // Descrição só quando acrescenta algo ao nome, para economizar espaço.
        return respostaJson(
          filtrados.map(({ cod, sigla, nome, descricao }) => ({
            cod, sigla: sigla || undefined, nome,
            descricao: descricao && descricao !== nome ? descricao : undefined,
          })),
        );
      } catch (e) {
        return respostaErro(e);
      }
    },
  );

  server.registerTool(
    "legislatura_do_periodo",
    {
      title: "Legislatura de um período",
      description: "Informa a legislatura atual ou as que cobrem um ano (útil para filtros de despesas, membros de partido etc.).",
      inputSchema: { ano: z.number().int().optional() },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ ano }) =>
      respostaJson(ano ? { ano, legislaturas: legislaturasDoAno(ano) } : { atual: legislaturaAtual() }),
  );
}

/** Grava arquivos no disco de quem roda o servidor: só faz sentido no plugin local (stdio). */
export function registrarExportacao(server: McpServer) {
  server.registerTool(
    "exportar_dados",
    {
      title: "Exportar dados para arquivo",
      description:
        "Baixa uma lista de qualquer endpoint (com paginação automática) e salva em CSV ou JSON no disco. " +
        "Use para extrações grandes ou quando o usuário quer um arquivo (planilha, base para análise). " +
        "CSV sai com separador ';' e BOM UTF-8 por padrão, para abrir direto no Excel em português. " +
        "Objetos aninhados viram colunas com ponto (ex.: ultimoStatus.siglaPartido). " +
        "Caminhos relativos são salvos na pasta do projeto aberto.",
      inputSchema: {
        caminho: z.string().describe("Endpoint de lista, ex.: 'proposicoes', 'deputados/204379/despesas'"),
        parametros: parametrosLivres,
        arquivo: z.string().describe("Arquivo de saída, ex.: 'dados/proposicoes-2025.csv'"),
        formato: z.enum(["csv", "json"]).default("csv"),
        separador: z.string().max(1).default(";"),
        max_itens: z.number().int().min(1).max(MAX_ITENS_ABSOLUTO).default(10_000),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
    },
    async ({ caminho, parametros = {}, arquivo, formato, separador, max_itens }) => {
      try {
        const r = await consultarPaginado(caminho, parametros, max_itens);
        const destino = resolverCaminho(arquivo);
        let colunas: string[] = [];
        if (formato === "csv") {
          const out = paraCsv(r.dados, separador);
          colunas = out.colunas;
          await salvarArquivo(destino, out.csv, true);
        } else {
          await salvarArquivo(destino, JSON.stringify(r.dados, null, 2), false);
          colunas = r.dados[0] ? Object.keys(r.dados[0]) : [];
        }
        return respostaJson({
          arquivo: destino,
          registros: r.dados.length,
          total_na_api: r.total,
          truncado: r.truncado,
          aviso: r.truncado ? "Há mais registros na API. Aumente max_itens ou use os arquivos em massa (skill extrair-dados)." : undefined,
          colunas,
          amostra: r.dados.slice(0, 3),
        });
      } catch (e) {
        return respostaErro(e);
      }
    },
  );
}
