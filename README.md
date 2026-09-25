# CamaraBR — plugin da Câmara dos Deputados para Claude Code

Plugin do [Claude Code](https://code.claude.com) para consultar, extrair e gerar relatórios com os
[Dados Abertos da Câmara dos Deputados](https://dadosabertos.camara.leg.br/swagger/api.html).

Pergunte em linguagem natural:

- "Faça um relatório do deputado Fulano em 2025"
- "Como está a tramitação do PL 2338/2023?"
- "Como cada partido votou na votação 2611313-31? Quem votou contra a orientação?"
- "Ranking de gastos da cota parlamentar por partido em 2025"
- "Exporte para CSV todas as PECs apresentadas em 2024"

## O que vem no plugin

| Componente | O que faz |
|---|---|
| **Servidor MCP `camara`** | 11 ferramentas que chamam a API: `buscar_deputados`, `perfil_deputado`, `despesas_deputado`, `buscar_proposicoes`, `dossie_proposicao`, `buscar_votacoes`, `resultado_votacao`, `listar_referencias`, `legislatura_do_periodo`, `consultar_api` (qualquer endpoint) e `exportar_dados` (CSV/JSON). Paginação, novas tentativas e armadilhas da API já tratadas. |
| **Skill `/camarabr:relatorio-deputado`** | Relatório completo de um(a) deputado(a) |
| **Skill `/camarabr:relatorio-proposicao`** | Dossiê de um projeto: situação, tramitação, votações |
| **Skill `/camarabr:relatorio-votacao`** | Placar, votos por partido, fidelidade à orientação |
| **Skill `/camarabr:analise-despesas`** | Análise da cota parlamentar (CEAP), inclusive rankings da Casa inteira via arquivo anual |
| **Skill `/camarabr:extrair-dados`** | Extração para CSV/JSON/XLSX (API ou arquivos em massa) |
| **Skill `dados-camara`** | Referência carregada automaticamente: conceitos e armadilhas da API |
| **Subagente `pesquisador-legislativo`** | Investigações que exigem muitas consultas cruzadas |

As skills também são acionadas automaticamente quando o pedido combina com elas; não é preciso digitar o `/`.

## Requisitos

- Claude Code
- Node.js 18 ou superior (`node --version`)

Nenhuma chave de API é necessária: os dados são públicos.

## Instalação

### A partir deste repositório no GitHub

```
/plugin marketplace add matfmc/camarabr
/plugin install camarabr@camara-dados-abertos
```

### A partir de uma pasta local

```
/plugin marketplace add C:\caminho\para\claude-plugin-camara
/plugin install camarabr@camara-dados-abertos
```

Para testar sem instalar: `claude --plugin-dir ./plugins/camarabr`.

## Estrutura

```
.claude-plugin/marketplace.json     catálogo (marketplace) com o plugin
plugins/camarabr/
  .claude-plugin/plugin.json        manifesto do plugin
  .mcp.json                         registra o servidor MCP
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

Depois de alterar skills ou o agente, use `/reload-plugins` no Claude Code. Antes de publicar, rode:

```
claude plugin validate ./plugins/camarabr --strict
claude plugin validate . --strict
```

Ao lançar uma versão nova, aumente `version` em `plugins/camarabr/.claude-plugin/plugin.json`.

## Armadilhas da API já tratadas

- `/deputados/{id}/despesas` devolve vazio (sem erro) sem `idLegislatura`. O servidor preenche o parâmetro.
- `/proposicoes`, `/votacoes` e `/eventos` sem datas cobrem só os últimos 30 dias.
- No arquivo anual da cota do ano corrente podem faltar passagens aéreas (SIGEPA) que a API já traz.

## Licença

MIT. Os dados são da Câmara dos Deputados e têm licença própria de dados abertos.
