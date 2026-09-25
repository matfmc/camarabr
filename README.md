# CamaraBR — plugin da Câmara dos Deputados para Claude Code

Plugin do [Claude Code](https://code.claude.com) para consultar, extrair e gerar relatórios com os
[Dados Abertos da Câmara dos Deputados](https://dadosabertos.camara.leg.br/swagger/api.html):
deputados, despesas da cota parlamentar, proposições, tramitações e votações.

**Para usar o plugin, veja o [README do plugin](plugins/camarabr/README.md)**: requisitos, instalação,
exemplos de perguntas e o que vem incluído.

## Instalação rápida

Requer Node.js 18 ou superior.

```
claude plugin marketplace add matfmc/camarabr
claude plugin install camarabr@camara-dados-abertos
```

## Estrutura

```
.claude-plugin/marketplace.json     catálogo (marketplace) com o plugin
plugins/camarabr/
  .claude-plugin/plugin.json        manifesto do plugin
  .mcp.json                         registra o servidor MCP
  README.md                         documentação para quem usa
  CHANGELOG.md                      histórico de versões
  server/                           código do servidor MCP (TypeScript)
    src/                            api.ts, ferramentas.ts, formato.ts, index.ts
    dist/index.js                   bundle versionado (quem instala não roda npm install)
    test/smoke.mjs                  teste contra a API real
  skills/<nome>/SKILL.md            skills
  skills/analise-despesas/scripts/  ceap.mjs (agrega o arquivo anual da cota)
  agents/pesquisador-legislativo.md subagente
```

## Desenvolvimento

```
cd plugins/camarabr/server
npm install
npm run typecheck
npm run build      # gera dist/index.js — faça commit dele
npm test           # chama cada ferramenta na API real
```

Para testar sem instalar: `claude --plugin-dir ./plugins/camarabr`. Depois de alterar skills ou o agente,
use `/reload-plugins` no Claude Code.

## Lançar uma versão

1. Aumente `version` em `plugins/camarabr/.claude-plugin/plugin.json` (sem isso, quem já instalou não
   recebe a atualização) e registre a mudança em `plugins/camarabr/CHANGELOG.md`.
2. Se mexeu no servidor, rode `npm run build` e `npm test`.
3. Valide:
   ```
   claude plugin validate ./plugins/camarabr --strict
   claude plugin validate . --strict
   ```
4. Faça commit e push para `main`. Quem usa recebe com `claude plugin update camarabr@camara-dados-abertos`.

## Licença

MIT. Os dados são da Câmara dos Deputados e seguem a política de dados abertos da Câmara.
