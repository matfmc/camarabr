---
name: dados-camara
description: Conhecimento de referência sobre a API de Dados Abertos da Câmara dos Deputados (dadosabertos.camara.leg.br) — ids, legislaturas, paginação, armadilhas conhecidas. Use sempre que for consultar deputados, despesas/cota parlamentar (CEAP), proposições, tramitações, votações, comissões, eventos, partidos ou frentes da Câmara.
user-invocable: false
---

# API de Dados Abertos da Câmara — guia rápido

Base: `https://dadosabertos.camara.leg.br/api/v2` · Docs: https://dadosabertos.camara.leg.br/swagger/api.html

As ferramentas do MCP `camara` já tratam paginação, novas tentativas e as armadilhas abaixo. Prefira:

| Objetivo | Ferramenta |
|---|---|
| Achar deputado (id) | `buscar_deputados` |
| Perfil, comissões, frentes | `perfil_deputado` |
| Gastos da cota (CEAP) de 1 deputado | `despesas_deputado` |
| Achar projeto | `buscar_proposicoes` |
| Situação, autores, tramitação, votações de um projeto | `dossie_proposicao` |
| Listar votações | `buscar_votacoes` |
| Placar, votos por partido, orientações | `resultado_votacao` |
| Códigos válidos (temas, tipos, situações) | `listar_referencias` |
| Qualquer outro endpoint | `consultar_api` |
| Salvar lista grande em CSV/JSON | `exportar_dados` |

## Conceitos

- **Legislatura** = mandato de 4 anos que começa em 1º/fev. A 57ª vai de 01/02/2023 a 31/01/2027. A 56ª foi de 2019 a 2023.
- **id do deputado** é estável entre legislaturas (é o `ideCadastro` nos arquivos da cota).
- **Plenário** é o órgão `idOrgao = 180`. Comissões têm siglas como CCJC, CFT, CE.
- **Proposições**: identifique pelo `id` interno. "PL 2338/2023" = `siglaTipo=PL, numero=2338, ano=2023`.
- **Votação** tem id no formato `"2611313-31"` (string). Votações simbólicas não têm votos individuais.

## Armadilhas conhecidas (verificadas)

1. **Despesas exigem `idLegislatura`.** `/deputados/{id}/despesas` devolve lista **vazia, sem erro** se `idLegislatura` não for enviado. As ferramentas preenchem isso sozinhas; se usar a API diretamente, envie sempre.
2. **`/proposicoes` sem filtro de data** traz só o que tramitou nos últimos 30 dias. Para histórico, use `ano`, `dataApresentacaoInicio/Fim` ou `siglaTipo+numero+ano`.
3. **`/votacoes` e `/eventos` sem datas** trazem só os últimos 30 dias. O intervalo `dataInicio`–`dataFim` deve ficar no mesmo ano.
4. **Paginação**: máximo de 100 itens por página. O total vem no cabeçalho `X-Total-Count`.
5. **Nos votos**, o deputado vem no campo `deputado_` (com sublinhado).
6. **`/proposicoes/{id}/relacionadas`** pode ter centenas de itens (quase todos requerimentos).
7. Em caso de HTTP 429, a API pede espera (`Retry-After`). O servidor já faz novas tentativas.

## Volume grande? Use arquivos em massa

Para análises da Casa inteira (todos os deputados, todas as votações de um ano), a API é lenta. Use os arquivos anuais descritos na skill `extrair-dados`.

## Boas práticas nos relatórios

- Cite a fonte: "Fonte: Câmara dos Deputados — Dados Abertos (dadosabertos.camara.leg.br), consultado em DD/MM/AAAA".
- Valores em R$ no formato brasileiro (R$ 1.234,56). Datas em DD/MM/AAAA.
- Informe o período e os filtros usados. Se algum dado veio truncado ou incompleto, diga isso.
- Seja neutro: descreva os dados sem juízo de valor sobre parlamentares ou partidos.
