#!/usr/bin/env node
// Agrega o arquivo anual da Cota Parlamentar (CEAP) da Câmara.
// Fonte: https://www.camara.leg.br/cotas/Ano-AAAA.csv.zip (descompactar antes).
//
// Uso:
//   node ceap.mjs Ano-2025.csv [--agrupar deputado,partido,uf,tipo,fornecedor,mes]
//                 [--uf SP,RJ] [--partido PT,PL] [--deputado 204379] [--tipo "PASSAGEM"]
//                 [--mes 1,2,3] [--top 20] [--saida resultado.csv]
//
// Imprime JSON com totais por agrupamento (valor líquido, em R$).
// Com --saida, grava também um CSV (separador ';', BOM UTF-8) com a tabela do 1º agrupamento.

import { createReadStream, writeFileSync } from "node:fs";

const args = process.argv.slice(2);
const arquivo = args.find((a) => !a.startsWith("--"));
const opcao = (nome) => {
  const i = args.indexOf(`--${nome}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const lista = (nome) => opcao(nome)?.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);

if (!arquivo) {
  console.error("Uso: node ceap.mjs Ano-2025.csv [--agrupar deputado,partido] [--uf SP] [--top 20] [--saida out.csv]");
  process.exit(1);
}

const agrupamentos = lista("agrupar")?.map((s) => s.toLowerCase()) ?? ["deputado", "partido", "uf", "tipo"];
const filtroUf = lista("uf");
const filtroPartido = lista("partido");
const filtroDeputado = lista("deputado");
const filtroTipo = opcao("tipo")?.toUpperCase();
const filtroMes = lista("mes")?.map(Number);
const top = Number(opcao("top") ?? 20);
const saida = opcao("saida");

const CHAVES = {
  deputado: (r) => (r.ideCadastro ? `${r.txNomeParlamentar} (${r.sgPartido}-${r.sgUF}) [id ${r.ideCadastro}]` : r.txNomeParlamentar),
  partido: (r) => r.sgPartido || "(sem partido/liderança)",
  uf: (r) => r.sgUF,
  tipo: (r) => r.txtDescricao,
  fornecedor: (r) => `${r.txtFornecedor} (${r.txtCNPJCPF || "s/ doc"})`,
  mes: (r) => `${r.numAno}-${String(r.numMes).padStart(2, "0")}`,
};
for (const a of agrupamentos) {
  if (!CHAVES[a]) {
    console.error(`Agrupamento inválido: ${a}. Use: ${Object.keys(CHAVES).join(", ")}`);
    process.exit(1);
  }
}

// Parser CSV em streaming (separador ';', aspas duplas, quebras de linha dentro de aspas).
async function* linhasCsv(caminho) {
  let campo = "", linha = [], aspas = false, primeiro = true;
  for await (const bloco of createReadStream(caminho, { encoding: "utf8" })) {
    let s = bloco;
    if (primeiro) { s = s.replace(/^﻿/, ""); primeiro = false; }
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      if (aspas) {
        if (c === '"') {
          if (s[i + 1] === '"') { campo += '"'; i++; } else aspas = false;
        } else campo += c;
      } else if (c === '"') aspas = true;
      else if (c === ";") { linha.push(campo); campo = ""; }
      else if (c === "\n") { linha.push(campo.replace(/\r$/, "")); yield linha; linha = []; campo = ""; }
      else campo += c;
    }
  }
  if (campo || linha.length) { linha.push(campo); yield linha; }
}

const grupos = Object.fromEntries(agrupamentos.map((a) => [a, new Map()]));
let cabecalho, total = 0, glosa = 0, notas = 0;

for await (const valores of linhasCsv(arquivo)) {
  if (!cabecalho) { cabecalho = valores; continue; }
  if (valores.length < cabecalho.length) continue;
  const r = Object.fromEntries(cabecalho.map((c, i) => [c, valores[i]]));
  if (filtroUf && !filtroUf.includes(r.sgUF)) continue;
  if (filtroPartido && !filtroPartido.includes(r.sgPartido)) continue;
  if (filtroDeputado && !filtroDeputado.includes(r.ideCadastro)) continue;
  if (filtroTipo && !r.txtDescricao.toUpperCase().includes(filtroTipo)) continue;
  if (filtroMes && !filtroMes.includes(Number(r.numMes))) continue;

  const valor = Number(String(r.vlrLiquido).replace(",", ".")) || 0;
  total += valor;
  glosa += Number(String(r.vlrGlosa).replace(",", ".")) || 0;
  notas++;
  for (const a of agrupamentos) {
    const k = CHAVES[a](r) || "(não informado)";
    const g = grupos[a].get(k) ?? { total: 0, notas: 0 };
    g.total += valor;
    g.notas++;
    grupos[a].set(k, g);
  }
}

const r2 = (n) => Math.round(n * 100) / 100;
const tabela = (mapa) =>
  [...mapa.entries()].map(([nome, g]) => ({ nome, total: r2(g.total), notas: g.notas })).sort((a, b) => b.total - a.total);

const resultado = {
  arquivo,
  filtros: { uf: filtroUf, partido: filtroPartido, deputado: filtroDeputado, tipo: filtroTipo, mes: filtroMes },
  notas,
  total_liquido: r2(total),
  total_glosado: r2(glosa),
};
for (const a of agrupamentos) {
  const t = tabela(grupos[a]);
  resultado[`por_${a}`] = { quantidade: t.length, top: a === "mes" ? t.sort((x, y) => x.nome.localeCompare(y.nome)) : t.slice(0, top) };
}

if (saida) {
  const t = tabela(grupos[agrupamentos[0]]);
  const esc = (v) => (/[;"\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
  const csv = [`${agrupamentos[0]};total_liquido;notas`, ...t.map((l) => `${esc(l.nome)};${String(l.total).replace(".", ",")};${l.notas}`)].join("\r\n");
  writeFileSync(saida, "﻿" + csv, "utf8");
  resultado.arquivo_saida = saida;
}

console.log(JSON.stringify(resultado, null, 2));
