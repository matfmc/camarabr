---
name: relatorio-deputado
description: Gera um relatório completo sobre um(a) deputado(a) federal — perfil, comissões, gastos da cota parlamentar, proposições de autoria e votações recentes. Use quando pedirem relatório, dossiê, perfil ou "tudo sobre" um deputado.
argument-hint: "<nome ou id do deputado> [ano]"
---

# Relatório de deputado(a)

Pedido: **$ARGUMENTS**

## 1. Identificar

- Se veio um nome, use `buscar_deputados` com `nome`. Se houver mais de um resultado, mostre as opções (nome, partido, UF) e pergunte qual é.
- Se o deputado não estiver em exercício, repita a busca com `idLegislatura` de legislaturas anteriores.
- Período padrão: ano corrente. Se o usuário informou um ano, use esse ano.

## 2. Coletar (faça as chamadas em paralelo quando possível)

1. `perfil_deputado` → dados pessoais, gabinete, comissões atuais, frentes.
2. `despesas_deputado` com `ano` → total, por tipo, por mês, top fornecedores.
3. `buscar_proposicoes` com `idDeputadoAutor` e `dataApresentacaoInicio`/`Fim` cobrindo o período → proposições de autoria. Separe PL/PEC/PLP (projetos) de REQ (requerimentos).
4. Opcional: `consultar_api` em `deputados/{id}/discursos` com `dataInicio`/`dataFim`, e em `deputados/{id}/eventos`.

## 3. Escrever

Salve em `relatorios/deputado-<nome-em-minusculas-com-hifens>-<ano>.md` (crie a pasta se preciso) com estas seções:

1. **Identificação**: nome civil e parlamentar, partido/UF, situação, gabinete, e-mail, foto (URL).
2. **Atuação**: comissões e cargos atuais, frentes parlamentares (quantas + as mais relevantes).
3. **Cota parlamentar (CEAP)**: total no período, tabela por tipo de despesa, evolução mensal, 10 maiores fornecedores. Mencione o valor glosado se houver.
4. **Produção legislativa**: contagem por tipo; tabela com os principais projetos (sigla, ementa resumida, situação).
5. **Discursos/eventos** (se coletados).
6. **Fonte e metodologia**: endpoints usados, período, data da consulta, limitações.

Formate valores como R$ 1.234,56. Não emita juízo de valor. No chat, mostre um resumo de 5 a 8 linhas e o caminho do arquivo.

Se o usuário pedir outro formato (HTML, planilha, Word), adapte a saída.
