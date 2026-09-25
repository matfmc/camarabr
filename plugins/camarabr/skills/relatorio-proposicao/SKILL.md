---
name: relatorio-proposicao
description: Gera um dossiê sobre uma proposição legislativa (PL, PEC, PLP, MPV...) — ementa, autores, situação, histórico de tramitação, votações e apensados. Use quando pedirem o andamento, a situação ou um relatório de um projeto de lei, ou para acompanhar um tema legislativo.
argument-hint: "<PL 1234/2025 | id | tema>"
---

# Dossiê de proposição

Pedido: **$ARGUMENTS**

## 1. Identificar

- Formato "PL 2338/2023": chame `dossie_proposicao` com `siglaTipo`, `numero` e `ano`.
- Só um id numérico: `dossie_proposicao` com `id`.
- Um tema (ex.: "inteligência artificial"): use `buscar_proposicoes` com `keywords` e um período (sem período, a API só traz os últimos 30 dias). Liste os candidatos e pergunte quais detalhar. Para um panorama do tema, veja a seção 4.

## 2. Coletar

- `dossie_proposicao` (aumente `max_tramitacoes` se precisar do histórico completo).
- Para cada votação nominal relevante (sobretudo no Plenário, órgão PLEN): `resultado_votacao`.
- Se a proposição está apensada a outra (`despacho` ou tramitação fala em "apensação"), diga isso e ofereça analisar a principal.

## 3. Escrever

Salve em `relatorios/proposicao-<sigla>-<numero>-<ano>.md` com:

1. **Resumo**: ementa, tipo, data de apresentação, autores (com partido/UF), regime de tramitação, forma de apreciação.
2. **Situação atual**: órgão, situação, último despacho, data. Deixe claro o que acontece em seguida.
3. **Linha do tempo**: tabela com as tramitações mais importantes (data, órgão, evento). Resuma as repetitivas.
4. **Votações**: data, órgão, resultado; placar e votos por partido nas nominais; orientações das bancadas.
5. **Relacionadas**: apensados relevantes (sem requerimentos, salvo se pedidos).
6. **Temas** e **fonte/metodologia**.

## 4. Panorama de um tema

Para vários projetos sobre um tema, use `exportar_dados` em `proposicoes` com `keywords` e o período, e depois resuma: quantidade por tipo, por ano, por partido do autor e por situação. Aponte os mais avançados na tramitação.
