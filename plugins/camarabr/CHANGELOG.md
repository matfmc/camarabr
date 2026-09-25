# Changelog

## 0.2.0 — 2026-09-25

- Servidor MCP ganha modo HTTP (Streamable HTTP, sem sessão) com `--http` ou `MCP_TRANSPORT=http`,
  para hospedar e usar como conector personalizado no claude.ai. O plugin continua em stdio.
- No modo HTTP, `exportar_dados` não é registrada: ela gravaria arquivos no disco do servidor.
- `Dockerfile` em `server/` e guia "Usar pela web" no README (Claude Code na web e conector no claude.ai).
- Teste de fumaça do modo HTTP (`npm run test:http`); `npm test` roda os dois modos.

## 0.1.1 — 2026-09-25

- Skill `analise-despesas`: o aviso sobre divergências entre o arquivo anual da cota e a API vale para
  qualquer ano, não só o corrente. Em 2025, havia passagens aéreas (SIGEPA) na API que faltavam no arquivo.
- README próprio do plugin, com requisitos, instalação, atualização e privacidade.
- Manifesto com `homepage`, `repository` e `author.url`.

## 0.1.0 — 2026-09-25

- Primeira versão: servidor MCP `camara` com 11 ferramentas, skills `relatorio-deputado`,
  `relatorio-proposicao`, `relatorio-votacao`, `analise-despesas`, `extrair-dados` e `dados-camara`,
  e o subagente `pesquisador-legislativo`.
