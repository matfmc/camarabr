import { mkdir, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, resolve } from "node:path";

// Respostas maiores que isso são cortadas; o Claude é orientado a usar exportar_dados.
const LIMITE_CARACTERES = 60_000;

// No modo HTTP não existe exportar_dados, então o aviso de corte sugere outra saída.
let dicaCorte = "ou use a ferramenta exportar_dados para salvar tudo em arquivo";
export function definirDicaCorte(texto: string) {
  dicaCorte = texto;
}

export function respostaJson(valor: unknown) {
  let texto = JSON.stringify(valor);
  if (texto.length > LIMITE_CARACTERES) {
    texto =
      texto.slice(0, LIMITE_CARACTERES) +
      `\n\n[RESPOSTA CORTADA: ${texto.length} caracteres. Filtre mais a consulta, reduza max_itens ` +
      `${dicaCorte}.]`;
  }
  return { content: [{ type: "text" as const, text: texto }] };
}

export function respostaErro(e: unknown) {
  const msg = e instanceof Error ? e.message : String(e);
  return { content: [{ type: "text" as const, text: `Erro: ${msg}` }], isError: true };
}

/** Achata objetos aninhados em chaves com ponto (ex.: ultimoStatus.nome). */
export function achatar(obj: any, prefixo = "", saida: Record<string, unknown> = {}): Record<string, unknown> {
  if (obj === null || typeof obj !== "object") {
    saida[prefixo || "valor"] = obj;
    return saida;
  }
  for (const [k, v] of Object.entries(obj)) {
    const chave = prefixo ? `${prefixo}.${k}` : k;
    if (v !== null && typeof v === "object" && !Array.isArray(v)) {
      achatar(v, chave, saida);
    } else if (Array.isArray(v)) {
      saida[chave] = v.every((x) => x === null || typeof x !== "object") ? v.join("|") : JSON.stringify(v);
    } else {
      saida[chave] = v;
    }
  }
  return saida;
}

export function paraCsv(linhas: any[], separador = ";"): { csv: string; colunas: string[] } {
  const planas = linhas.map((l) => achatar(l));
  const colunas: string[] = [];
  const vistas = new Set<string>();
  for (const l of planas) {
    for (const k of Object.keys(l)) {
      if (!vistas.has(k)) {
        vistas.add(k);
        colunas.push(k);
      }
    }
  }
  const escapar = (v: unknown) => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    return /["\r\n]/.test(s) || s.includes(separador) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const corpo = planas.map((l) => colunas.map((c) => escapar(l[c])).join(separador));
  return { csv: [colunas.map(escapar).join(separador), ...corpo].join("\r\n"), colunas };
}

/** Caminhos relativos são resolvidos a partir do projeto aberto no Claude Code. */
export function resolverCaminho(arquivo: string): string {
  if (isAbsolute(arquivo)) return arquivo;
  const projeto = process.env.CLAUDE_PROJECT_DIR;
  const base = projeto && !projeto.includes("${") ? projeto : process.cwd();
  return resolve(base, arquivo);
}

export async function salvarArquivo(caminho: string, conteudo: string, bomUtf8: boolean): Promise<void> {
  await mkdir(dirname(caminho), { recursive: true });
  await writeFile(caminho, (bomUtf8 ? "﻿" : "") + conteudo, "utf8");
}

export function somar<T>(itens: T[], chave: (x: T) => string, valor: (x: T) => number) {
  const mapa = new Map<string, { total: number; quantidade: number }>();
  for (const it of itens) {
    const k = chave(it) || "(não informado)";
    const atual = mapa.get(k) ?? { total: 0, quantidade: 0 };
    atual.total += valor(it) || 0;
    atual.quantidade++;
    mapa.set(k, atual);
  }
  return [...mapa.entries()]
    .map(([nome, v]) => ({ nome, total: arredondar(v.total), quantidade: v.quantidade }))
    .sort((a, b) => b.total - a.total);
}

export const arredondar = (n: number) => Math.round(n * 100) / 100;
