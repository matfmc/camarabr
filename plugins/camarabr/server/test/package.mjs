// Valida o pacote e o protocolo MCP sem rede nem instalação nos clientes.
import assert from "node:assert/strict";
import { copyFile, mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const root = fileURLToPath(new URL("../../", import.meta.url));
const json = async (path) => JSON.parse(await readFile(path, "utf8"));
const claude = await json(join(root, ".claude-plugin/plugin.json"));
const codex = await json(join(root, ".codex-plugin/plugin.json"));
const mcp = await json(join(root, ".mcp.json"));

test("catálogo e manifestos apontam para o mesmo plugin e componentes", async () => {
  const repo = resolve(root, "../..");
  const marketplace = await json(join(repo, ".claude-plugin/marketplace.json"));
  const entry = marketplace.plugins.find((item) => item.name === claude.name);
  assert.ok(entry, "plugin ausente do catálogo");
  assert.equal(resolve(repo, entry.source), resolve(root));
  for (const key of ["name", "version", "description", "author", "license", "repository", "homepage", "keywords"]) {
    assert.deepEqual(codex[key], claude[key], `metadado divergente: ${key}`);
  }
  assert.equal(codex.name, "camarabr");
  assert.equal(codex.skills, "./skills/");
  assert.equal(codex.mcpServers, "./.mcp.json");
  assert.deepEqual(await json(join(root, codex.mcpServers)), mcp);
  for (const name of ["dados-camara", "analise-despesas", "extrair-dados", "relatorio-deputado", "relatorio-proposicao", "relatorio-votacao"]) {
    const skill = await readFile(join(root, codex.skills, name, "SKILL.md"), "utf8");
    assert.ok(skill.startsWith("---"), `frontmatter ausente: ${name}`);
    assert.ok(skill.includes(`name: ${name}`));
  }
});

test("MCP inicia fora do projeto, em caminho com espaços e sem node_modules", { timeout: 20000 }, async () => {
  const temp = await mkdtemp(join(tmpdir(), "camarabr pacote "));
  const installed = join(temp, "plugin instalado");
  const bundle = join(installed, "server/dist/index.js");
  const client = new Client({ name: "package-test", version: "1.0.0" });
  let transport;
  try {
    await mkdir(dirname(bundle), { recursive: true });
    await copyFile(join(root, "server/dist/index.js"), bundle);
    const server = mcp.mcpServers.camara;
    assert.equal(server.command, "node");
    // Os hosts substituem esse marcador antes de iniciar o processo.
    // Este teste verifica o resultado da substituição, não o carregador dos hosts.
    const args = server.args.map((arg) => arg.replaceAll("${CLAUDE_PLUGIN_ROOT}", installed));
    assert.ok(args.every((arg) => !arg.includes("${")), "marcador MCP não resolvido");
    transport = new StdioClientTransport({ command: process.execPath, args, cwd: temp });
    await client.connect(transport);
    const { tools } = await client.listTools();
    assert.equal(tools.length, 11);
    assert.ok(tools.some((tool) => tool.name === "exportar_dados"));
    const result = await client.callTool({ name: "legislatura_do_periodo", arguments: { ano: 2023 } });
    assert.ok(!result.isError, JSON.stringify(result));
    const text = result.content.find((item) => item.type === "text");
    assert.ok(text);
    assert.deepEqual(JSON.parse(text.text), { ano: 2023, legislaturas: [56, 57] });
  } finally {
    await client.close();
    await transport?.close();
    assert.equal(dirname(resolve(temp)), resolve(tmpdir()), "limpeza deve ficar na pasta temporária");
    await rm(temp, { recursive: true, force: true });
  }
});
