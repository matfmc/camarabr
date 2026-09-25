// Teste de fumaça: sobe o servidor empacotado via stdio e chama cada ferramenta na API real.
// Uso: npm run build && npm test
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import assert from "node:assert/strict";

const client = new Client({ name: "smoke", version: "0" });
await client.connect(new StdioClientTransport({ command: process.execPath, args: ["dist/index.js"] }));

const { tools } = await client.listTools();
console.log(`ferramentas: ${tools.map((t) => t.name).join(", ")}`);

async function chamar(name, args) {
  const r = await client.callTool({ name, arguments: args });
  const texto = r.content[0].text;
  assert.ok(!r.isError, `${name} falhou: ${texto}`);
  const json = JSON.parse(texto);
  console.log(`✔ ${name}`);
  return json;
}

const deps = await chamar("buscar_deputados", { siglaUf: ["AC"] });
assert.equal(deps.dados.length, 8, "Acre tem 8 deputados");
const idDep = deps.dados[0].id;

const perfil = await chamar("perfil_deputado", { id: idDep });
assert.equal(perfil.detalhes.id, idDep);

const desp = await chamar("despesas_deputado", { id: idDep, ano: 2024 });
assert.ok(desp.quantidade_notas > 0, "despesas de 2024 não podem vir vazias");
assert.ok(desp.total_liquido > 0);

const gen = await chamar("consultar_api", { caminho: `deputados/${idDep}/despesas`, parametros: { ano: 2024 }, max_itens: 5 });
assert.ok(gen.retornados > 0, "consultar_api deve corrigir idLegislatura em despesas");

const prop = await chamar("buscar_proposicoes", { siglaTipo: ["PL"], numero: 2338, ano: [2023] });
assert.equal(prop.dados[0].id, 2487262);

const dossie = await chamar("dossie_proposicao", { siglaTipo: "PL", numero: 2338, ano: 2023, max_tramitacoes: 5 });
assert.equal(dossie.detalhes.id, 2487262);

const vot = await chamar("buscar_votacoes", { idOrgao: 180, dataInicio: "2026-09-01", dataFim: "2026-09-10" });
assert.ok(vot.dados.length > 0);

const res = await chamar("resultado_votacao", { id: "2611313-31" });
assert.ok(res.nominal && res.placar.Sim > 0, "votação nominal deve ter placar");

await chamar("listar_referencias", { tipo: "proposicoes/siglaTipo" });
await chamar("legislatura_do_periodo", { ano: 2023 });

const dir = mkdtempSync(join(tmpdir(), "camara-"));
const exp = await chamar("exportar_dados", { caminho: "deputados", parametros: { siglaUf: "AC" }, arquivo: join(dir, "ac.csv") });
assert.equal(exp.registros, 8);
const csv = readFileSync(exp.arquivo, "utf8");
assert.ok(csv.startsWith("﻿id;"), "CSV deve ter BOM e separador ';'");

await client.close();
console.log("\nTodos os testes passaram.");
