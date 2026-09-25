---
name: relatorio-votacao
description: Analisa votações da Câmara — placar, como cada partido e bancada estadual votou, fidelidade à orientação do partido e votos individuais. Use quando perguntarem como os deputados votaram em algo, quem votou contra/a favor, ou quiserem comparar bancadas.
argument-hint: "<id da votação | proposição | período>"
---

# Análise de votação

Pedido: **$ARGUMENTS**

## 1. Achar a votação

- Com id (formato `2611313-31`): siga para o passo 2.
- Com uma proposição: `dossie_proposicao` → lista `votacoes` (prefira as do órgão PLEN).
- Com um período ou assunto: `buscar_votacoes` (`idOrgao: 180` para o Plenário) e filtre pela `descricao`.
- Uma proposição costuma ter várias votações (requerimentos, destaques, texto-base, redação final). Pergunte qual interessa, ou analise o **texto-base/substitutivo** e diga isso.

## 2. Coletar

`resultado_votacao` com `incluir_votos_individuais: true`.

Se `nominal` vier `false`, a votação foi simbólica: não existe voto individual. Informe o resultado (`aprovacao`) e a descrição.

## 3. Analisar

- **Placar**: Sim, Não, Abstenção, Obstrução e total que votou. Ausentes ≈ 513 menos esse total (aproximado: há cadeiras em licença ou vagas).
- **Por partido**: tabela com os votos por partido, ordenada pelo tamanho da bancada. Marque os partidos divididos (nenhuma opção com mais de 80%).
- **Fidelidade à orientação**: compare o voto de cada deputado com a orientação da sua bancada (`orientacoes`). Liste quem votou contra a orientação. Orientação "Liberado" não conta.
- **Por UF**, se o usuário pedir.

## 4. Entregar

Resumo no chat. Se pedirem relatório ou a análise for longa, salve em `relatorios/votacao-<id>.md`. Para a lista completa de votos em planilha, use `exportar_dados` com `caminho: "votacoes/<id>/votos"`.

Para analisar muitas votações de uma vez (ex.: todas do ano), use os arquivos `votacoesVotos-AAAA.csv` e `votacoesOrientacoes-AAAA.csv` da skill `extrair-dados`.
