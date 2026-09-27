# Desenvolvimento do CamaraBR

Guia para quem mantém ou contribui com o plugin. Para instalar e começar a usar,
veja o [README](README.md) e o [manual rápido](MANUAL.md).

Execute os comandos abaixo a partir da raiz do repositório, salvo quando houver um `cd` explícito.

## Estrutura

```
.claude-plugin/marketplace.json     catálogo compartilhado por Claude e Codex
plugins/camarabr/
  .claude-plugin/plugin.json        manifesto do Claude
  .codex-plugin/plugin.json         manifesto e apresentação no Codex
  .mcp.json                         servidor MCP compartilhado
  README.md                         documentação para quem usa
  CHANGELOG.md                      histórico de versões
  server/                           código do servidor MCP (TypeScript)
    src/                            api.ts, ferramentas.ts, formato.ts, index.ts
    dist/index.js                   bundle versionado (quem instala não roda npm install)
    test/smoke.mjs                  teste contra a API real
    test/package.mjs                teste local do pacote nos dois formatos
  skills/<nome>/SKILL.md            skills
  skills/analise-despesas/scripts/  ceap.mjs (agrega o arquivo anual da cota)
  agents/pesquisador-legislativo.md subagente do Claude
```

## Desenvolvimento

```
cd plugins/camarabr/server
npm install
npm run typecheck
npm run test:package # valida manifestos e inicializa o bundle sem acesso à rede
npm run build      # gera dist/index.js — faça commit dele
npm test           # chama cada ferramenta na API real
```

Para testar sem instalar: `claude --plugin-dir ./plugins/camarabr`. Depois de alterar skills ou o agente,
use `/reload-plugins` no Claude Code.

Para testar o checkout no Codex, execute na raiz deste repositório:

```
codex plugin marketplace add .
codex plugin add camarabr@camara-dados-abertos
```

Use `codex plugin marketplace list` para conferir se o catálogo aponta para esta pasta.
Se já tiver o catálogo remoto com o mesmo nome, remova esse registro com
`codex plugin marketplace remove camara-dados-abertos` antes de adicionar a origem local.
Após reinstalar, abra uma conversa nova para carregar as skills e o MCP atualizados.

Os dois clientes usam `skills/` e `.mcp.json`. O Codex aceita o catálogo do Claude e o marcador
`${CLAUDE_PLUGIN_ROOT}` da configuração MCP. Já `${CLAUDE_SKILL_DIR}` e `$ARGUMENTS` são
conveniências do Claude: as skills incluem orientações para funcionar sem essas substituições.
O arquivo em `agents/` registra um subagente no Claude; no Codex, use as skills pela conversa.

O teste `test:package` verifica os arquivos e o protocolo MCP após substituir o caminho do plugin;
ele não executa os carregadores dos clientes. Valide também a instalação em uma conversa nova.
O validador de plugins do Codex aceita as skills compartilhadas. Já o `quick_validate.py` genérico
de skills rejeita as extensões `argument-hint` e `user-invocable` do Claude, mantidas de propósito
para preservar as dicas dos atalhos e a skill de referência oculta no Claude.

Referências: [empacotamento no Codex](https://developers.openai.com/plugins/build/plugins) e
[manifesto do Claude](https://code.claude.com/docs/en/plugins-reference).

## Lançar uma versão

1. Aumente `version` nos dois manifestos, `.claude-plugin/plugin.json` e `.codex-plugin/plugin.json`,
   mantendo os valores iguais, e registre a mudança em `plugins/camarabr/CHANGELOG.md`.
   A versão do servidor MCP só precisa mudar quando o servidor mudar.
2. Se mexeu no servidor, rode `npm run build` e `npm test`.
3. Valide:
   ```
   npm --prefix plugins/camarabr/server run test:package
   claude plugin validate ./plugins/camarabr --strict
   claude plugin validate . --strict
   ```
4. Faça commit e push para `main`. Quem usa recebe com `claude plugin update camarabr@camara-dados-abertos`.
   No Codex, execute `codex plugin marketplace upgrade camara-dados-abertos` e depois
   `codex plugin add camarabr@camara-dados-abertos`; abra uma conversa nova.

## Licença

MIT. Os dados são da Câmara dos Deputados e seguem a política de dados abertos da Câmara.
