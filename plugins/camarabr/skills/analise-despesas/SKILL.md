---
name: analise-despesas
description: Analisa gastos da Cota para o Exercício da Atividade Parlamentar (CEAP / cota parlamentar) — rankings de deputados, partidos e estados, gastos por tipo, maiores fornecedores, evolução mensal e comparações. Use para qualquer pergunta sobre despesas, reembolsos, gastos ou fornecedores de deputados.
argument-hint: "[pergunta, ex.: 'ranking de gastos por partido em 2025']"
allowed-tools: Bash(node ${CLAUDE_SKILL_DIR}/scripts/ceap.mjs *)
---

# Análise da cota parlamentar (CEAP)

Pedido: **$ARGUMENTS**

## Escolha a fonte

| Pergunta | Fonte |
|---|---|
| Um deputado (ou poucos) | Ferramenta `despesas_deputado` (API) |
| Rankings e comparações entre deputados, partidos, UFs ou fornecedores | Arquivo anual em massa + script `ceap.mjs` |
| Quem recebeu de um fornecedor (CNPJ/CPF) | Arquivo anual (a API só filtra por fornecedor dentro de um deputado) |

## Caminho A — API (um deputado)

`despesas_deputado` com `id` e `ano` (e `mes`, se quiser). A resposta já traz totais por tipo, por mês e os maiores fornecedores. Use `incluir_notas: true` só se precisar das notas individuais (links para os PDFs).

## Caminho B — arquivo anual (Casa inteira)

1. Baixe e descompacte, pedindo confirmação antes (os arquivos têm de 5 a 10 MB compactados e de 40 a 300 MB descompactados):
   ```
   mkdir -p dados
   curl -L -o dados/Ano-2025.csv.zip https://www.camara.leg.br/cotas/Ano-2025.csv.zip
   tar -xf dados/Ano-2025.csv.zip -C dados        # Windows/macOS; no Linux use: unzip -o dados/Ano-2025.csv.zip -d dados
   ```
   Reaproveite o arquivo se ele já estiver em `dados/`.
2. Agregue com o script que vem na skill:
   ```
   node ${CLAUDE_SKILL_DIR}/scripts/ceap.mjs dados/Ano-2025.csv --agrupar deputado,partido,uf,tipo --top 20
   ```
   Opções:
   - `--agrupar` recebe uma ou mais de: deputado, partido, uf, tipo, fornecedor, mes.
   - Filtros: `--uf SP,RJ`, `--partido PL,PT`, `--deputado <id>`, `--tipo "PASSAGEM"`, `--mes 1,2,3`.
   - `--top N` limita o tamanho dos rankings.
   - `--saida arquivo.csv` grava a tabela completa do 1º agrupamento, pronta para o Excel.
3. Colunas do CSV, se precisar de outra análise: `txNomeParlamentar`, `ideCadastro` (id do deputado na API), `sgUF`, `sgPartido`, `txtDescricao` (tipo), `txtFornecedor`, `txtCNPJCPF`, `datEmissao`, `vlrDocumento`, `vlrGlosa`, `vlrLiquido`, `numMes`, `numAno`, `urlDocumento`. Separador `;`, UTF-8 com BOM.

## Cuidados (verificados nos dados)

- **Some sempre `vlrLiquido`**, que é o valor efetivamente reembolsado. `vlrDocumento` inclui glosas.
- **As lideranças partidárias** ("LIDERANÇA DO PT", "LID.GOV-CD") aparecem como se fossem parlamentares, com `ideCadastro` vazio. Exclua-as de rankings de deputados, ou mostre-as à parte.
- **O arquivo em massa não bate exatamente com a API, mesmo em anos fechados.** Em setembro de 2026, o `Ano-2026.csv` não tinha nenhuma linha "PASSAGEM AÉREA - SIGEPA", que a API já trazia. No `Ano-2025.csv` elas existem (37 mil), mas faltam algumas: para o deputado 204534, o arquivo tinha 54 passagens (R$ 19,5 mil) e a API, 84 (R$ 46,1 mil). No sentido oposto, "CELULAR FUNCIONAL" (telefonia) aparece no arquivo e não na API. Em qualquer ano, confira o total de ao menos um deputado com `despesas_deputado` e avise o usuário sobre a diferença. Para valores de um deputado específico, prefira a API.
- **O teto da cota varia por UF** (é maior para estados mais distantes de Brasília). Comparar valores absolutos entre UFs sem dizer isso é enganoso.
- **Deputados que exerceram parte do ano** (suplentes, licenciados) gastam menos. Diga isso ao montar rankings.

## Entrega

Resumo no chat com os principais números e, se for uma análise extensa, um relatório em `relatorios/despesas-<tema>-<ano>.md` com tabelas, fonte e metodologia. Seja factual: gasto alto não significa irregularidade.
