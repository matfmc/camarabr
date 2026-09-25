---
name: extrair-dados
description: Extrai dados da Câmara dos Deputados para arquivos (CSV, JSON, XLSX) — listas de deputados, proposições, votações, votos, eventos, órgãos, frentes, despesas. Use quando pedirem para baixar, exportar, extrair, montar uma base ou planilha com dados da Câmara.
argument-hint: "<o que extrair> [período] [formato]"
---

# Extração de dados da Câmara

Pedido: **$ARGUMENTS**

Salve em `dados/` no projeto, a menos que o usuário indique outro lugar. Diga sempre o caminho, o número de registros e as colunas principais.

## Escolha o método

**Até alguns milhares de registros, ou com filtros específicos** → ferramenta `exportar_dados`:
- `caminho`: o endpoint de lista (ex.: `proposicoes`, `deputados`, `orgaos/2003/membros`, `votacoes/2611313-31/votos`).
- `parametros`: os filtros do endpoint (veja a skill `dados-camara` e `listar_referencias`).
- O CSV sai com separador `;` e BOM UTF-8, e abre certo no Excel em português.
- Se vier `truncado: true`, aumente `max_itens` ou troque para arquivos em massa.

**Anos inteiros, a Casa toda, ou mais de 10 mil registros** → arquivos em massa oficiais (bem mais rápidos). Peça confirmação antes de baixar arquivos grandes e baixe com `curl -L -o dados/<nome> <url>`.

Padrão: `https://dadosabertos.camara.leg.br/arquivos/<conjunto>/<formato>/<conjunto>-<ano>.<formato>`, onde `<formato>` é `csv`, `json` ou `xlsx`.

| Conjunto | Arquivo (exemplo CSV) |
|---|---|
| Proposições apresentadas no ano | `proposicoes/csv/proposicoes-2025.csv` |
| Autores das proposições | `proposicoesAutores/csv/proposicoesAutores-2025.csv` |
| Temas das proposições | `proposicoesTemas/csv/proposicoesTemas-2025.csv` |
| Votações | `votacoes/csv/votacoes-2025.csv` |
| Votos individuais | `votacoesVotos/csv/votacoesVotos-2025.csv` |
| Orientações das bancadas | `votacoesOrientacoes/csv/votacoesOrientacoes-2025.csv` |
| Proposições votadas | `votacoesProposicoes/csv/votacoesProposicoes-2025.csv` |
| Eventos (sessões, reuniões) | `eventos/csv/eventos-2025.csv` |
| Deputados (todos, histórico) | `deputados/csv/deputados.csv` |
| Profissões dos deputados | `deputadosProfissoes/csv/deputadosProfissoes.csv` |
| Órgãos / comissões | `orgaos/csv/orgaos.csv` |
| Membros de órgãos por legislatura | `orgaosDeputados/csv/orgaosDeputados-L57.csv` |
| Frentes parlamentares e membros | `frentes/csv/frentes.csv`, `frentesDeputados/csv/frentesDeputados.csv` |
| Cota parlamentar (CEAP) | `https://www.camara.leg.br/cotas/Ano-2025.csv.zip` (veja a skill `analise-despesas`) |

Não existe arquivo anual de tramitações. Para tramitações, use `consultar_api` em `proposicoes/{id}/tramitacoes`.

Os CSVs em massa usam separador `;`, UTF-8 com BOM, e os campos aninhados vêm com sublinhado (ex.: `deputado_siglaPartido`).

## Depois de extrair

Ofereça os próximos passos: resumo estatístico, cruzamento entre arquivos (ex.: votos × deputados pelo id), gráfico ou relatório. Para processar CSVs grandes, escreva scripts em Node (`node`), que já está disponível porque o plugin depende dele.
