# Changelog

## 0.2.1 — 2026-09-25

- Removido o modo HTTP do servidor MCP, que entrou na 0.2.0: o servidor volta a rodar só em stdio,
  como plugin. O uso pela web fica pelo Claude Code na web (claude.ai/code).
- README com a seção "Usar pela web", só para o Claude Code na web.

## 0.2.0 — 2026-09-25

- Modo HTTP do servidor MCP para uso como conector no claude.ai (removido na 0.2.1).

## 0.1.1 — 2026-09-25

- Skill `analise-despesas`: o aviso sobre divergências entre o arquivo anual da cota e a API vale para
  qualquer ano, não só o corrente. Em 2025, havia passagens aéreas (SIGEPA) na API que faltavam no arquivo.
- README próprio do plugin, com requisitos, instalação, atualização e privacidade.
- Manifesto com `homepage`, `repository` e `author.url`.

## 0.1.0 — 2026-09-25

- Primeira versão: servidor MCP `camara` com 11 ferramentas, skills `relatorio-deputado`,
  `relatorio-proposicao`, `relatorio-votacao`, `analise-despesas`, `extrair-dados` e `dados-camara`,
  e o subagente `pesquisador-legislativo`.
