// Cliente HTTP para a API de Dados Abertos da Câmara dos Deputados (v2).
// Docs: https://dadosabertos.camara.leg.br/swagger/api.html

export const BASE_URL = "https://dadosabertos.camara.leg.br/api/v2";

const TIMEOUT_MS = 30_000;
const MAX_TENTATIVAS = 4;
// A API aceita no máximo 100 itens por página na maioria dos endpoints.
const ITENS_POR_PAGINA = 100;
// Limite de segurança para paginação automática.
export const MAX_ITENS_ABSOLUTO = 50_000;

export type Parametros = Record<string, string | number | boolean | undefined | null | Array<string | number>>;

export interface RespostaLista {
  dados: any[];
  total: number | null;
  paginasLidas: number;
  truncado: boolean;
}

export class ErroApi extends Error {
  constructor(message: string, public status?: number) {
    super(message);
  }
}

export function montarUrl(caminho: string, params: Parametros = {}): string {
  const limpo = caminho.startsWith("http")
    ? caminho
    : `${BASE_URL}/${caminho.replace(/^\/+/, "")}`;
  const url = new URL(limpo);
  for (const [chave, valor] of Object.entries(params)) {
    if (valor === undefined || valor === null || valor === "") continue;
    if (Array.isArray(valor)) {
      // A API aceita listas separadas por vírgula (ex.: siglaUf=SP,RJ).
      url.searchParams.set(chave, valor.join(","));
    } else {
      url.searchParams.set(chave, String(valor));
    }
  }
  return url.toString();
}

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function buscar(url: string): Promise<{ corpo: any; total: number | null }> {
  let ultimoErro: unknown;
  for (let tentativa = 1; tentativa <= MAX_TENTATIVAS; tentativa++) {
    try {
      const resp = await fetch(url, {
        headers: { Accept: "application/json", "User-Agent": "camarabr/0.1" },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (resp.status === 429 || resp.status >= 500) {
        const retryAfter = Number(resp.headers.get("retry-after"));
        const espera = Number.isFinite(retryAfter) && retryAfter > 0
          ? Math.min(retryAfter, 30) * 1000
          : 1000 * 2 ** (tentativa - 1);
        ultimoErro = new ErroApi(`HTTP ${resp.status} em ${url}`, resp.status);
        if (tentativa < MAX_TENTATIVAS) await esperar(espera);
        continue;
      }
      const texto = await resp.text();
      let corpo: any;
      try {
        corpo = texto ? JSON.parse(texto) : {};
      } catch {
        throw new ErroApi(`Resposta não-JSON (HTTP ${resp.status}) em ${url}: ${texto.slice(0, 200)}`, resp.status);
      }
      if (!resp.ok) {
        const detalhe = corpo?.detail || corpo?.title || texto.slice(0, 300);
        throw new ErroApi(`HTTP ${resp.status} em ${url}: ${detalhe}`, resp.status);
      }
      const totalHeader = resp.headers.get("x-total-count");
      return { corpo, total: totalHeader !== null ? Number(totalHeader) : null };
    } catch (e) {
      if (e instanceof ErroApi && e.status && e.status < 500 && e.status !== 429) throw e;
      ultimoErro = e;
      if (tentativa < MAX_TENTATIVAS) await esperar(1000 * 2 ** (tentativa - 1));
    }
  }
  throw ultimoErro instanceof Error ? ultimoErro : new ErroApi(String(ultimoErro));
}

/** GET simples: devolve `dados` do recurso (objeto ou lista, sem paginar). */
export async function obter(caminho: string, params: Parametros = {}): Promise<any> {
  const { corpo } = await buscar(montarUrl(caminho, params));
  return corpo?.dados ?? corpo;
}

/**
 * GET paginado: segue os links `next` até juntar `maxItens` registros
 * ou acabar a lista.
 */
export async function obterTodos(
  caminho: string,
  params: Parametros = {},
  maxItens = 1000,
): Promise<RespostaLista> {
  const limite = Math.min(Math.max(1, maxItens), MAX_ITENS_ABSOLUTO);
  const itens = Math.min(ITENS_POR_PAGINA, limite);
  let url: string | null = montarUrl(caminho, { ...params, itens, pagina: params.pagina ?? 1 });
  const dados: any[] = [];
  let total: number | null = null;
  let paginasLidas = 0;

  while (url && dados.length < limite) {
    const { corpo, total: t }: { corpo: any; total: number | null } = await buscar(url);
    paginasLidas++;
    if (total === null) total = t;
    const pagina = Array.isArray(corpo?.dados) ? corpo.dados : [];
    dados.push(...pagina);
    const next: any = (corpo?.links ?? []).find((l: any) => l.rel === "next");
    url = next?.href ?? null;
    if (pagina.length === 0) break;
  }

  const truncado = dados.length > limite || url !== null;
  return { dados: dados.slice(0, limite), total, paginasLidas, truncado };
}

// ---------- Legislaturas ----------

// Legislaturas duram 4 anos e começam em 1º de fevereiro. A 57ª começou em 01/02/2023.
export function legislaturaNaData(data: Date): number {
  const meses = (data.getUTCFullYear() - 2023) * 12 + (data.getUTCMonth() - 1);
  return 57 + Math.floor(meses / 48);
}

export function legislaturaAtual(): number {
  return legislaturaNaData(new Date());
}

/** Legislaturas que cobrem um ano civil (um ano de início cobre duas: janeiro é da anterior). */
export function legislaturasDoAno(ano: number): number[] {
  const jan = legislaturaNaData(new Date(Date.UTC(ano, 0, 15)));
  const dez = legislaturaNaData(new Date(Date.UTC(ano, 11, 15)));
  return jan === dez ? [jan] : [jan, dez];
}

/**
 * O endpoint /deputados/{id}/despesas devolve lista vazia se `idLegislatura`
 * não for informado. Preenche o parâmetro quando ausente.
 */
export function corrigirParametrosDespesas(caminho: string, params: Parametros): Parametros[] {
  if (!/deputados\/\d+\/despesas/.test(caminho) || params.idLegislatura) return [params];
  const ano = params.ano !== undefined && params.ano !== null && params.ano !== "" ? Number(params.ano) : NaN;
  const legs = Number.isFinite(ano) ? legislaturasDoAno(ano) : [legislaturaAtual()];
  return legs.map((idLegislatura) => ({ ...params, idLegislatura }));
}
