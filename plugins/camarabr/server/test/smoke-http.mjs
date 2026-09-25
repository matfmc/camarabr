// Teste de fumaça do modo HTTP: sobe o bundle com --http numa porta livre e chama algumas ferramentas.
// Uso: npm run build && npm run test:http
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { spawn } from "node:child_process";
import assert from "node:assert/strict";

const proc = spawn(process.execPath, ["dist/index.js", "--http"], {
  env: { ...process.env, PORT: "0", HOST: "127.0.0.1" },
  stdio: ["ignore", "inherit", "pipe"],
});

try {
  const base = await new Promise((ok, falha) => {
    let log = "";
    proc.stderr.on("data", (d) => {
      log += d;
      const m = log.match(/ouvindo em (http:\/\/\S+)\/mcp/);
      if (m) ok(m[1]);
    });
    proc.on("exit", (c) => falha(new Error(`servidor saiu (código ${c}): ${log}`)));
    setTimeout(() => falha(new Error(`servidor não subiu: ${log}`)), 10_000);
  });

  const saude = await fetch(`${base}/`);
  assert.equal(saude.status, 200);
  assert.equal((await fetch(`${base}/mcp`)).status, 405, "GET /mcp deve responder 405");
  console.log("✔ rotas HTTP");

  const client = new Client({ name: "smoke-http", version: "0" });
  await client.connect(new StreamableHTTPClientTransport(new URL(`${base}/mcp`)));

  const { tools } = await client.listTools();
  const nomes = tools.map((t) => t.name);
  console.log(`ferramentas: ${nomes.join(", ")}`);
  assert.equal(nomes.length, 10);
  assert.ok(!nomes.includes("exportar_dados"), "exportar_dados não pode existir no modo HTTP");
  assert.ok(!client.getInstructions()?.includes("exportar_dados"), "instruções não devem citar exportar_dados");

  async function chamar(name, args) {
    const r = await client.callTool({ name, arguments: args });
    const texto = r.content[0].text;
    assert.ok(!r.isError, `${name} falhou: ${texto}`);
    console.log(`✔ ${name}`);
    return JSON.parse(texto);
  }

  const deps = await chamar("buscar_deputados", { siglaUf: ["AC"] });
  assert.equal(deps.dados.length, 8, "Acre tem 8 deputados");
  const res = await chamar("resultado_votacao", { id: "2611313-31" });
  assert.ok(res.nominal && res.placar.Sim > 0, "votação nominal deve ter placar");

  await client.close();
  console.log("\nTodos os testes HTTP passaram.");
} finally {
  proc.kill();
}
