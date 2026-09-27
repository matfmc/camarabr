# CamaraBR — Câmara dos Deputados no Claude e no Codex

Consulte deputados, gastos da cota parlamentar, projetos de lei e votações usando os
[Dados Abertos da Câmara dos Deputados](https://dadosabertos.camara.leg.br/).
Pergunte em português, sem cadastro nem chave de API.

## Instalação rápida

Requer **Node.js 18 ou superior** e Claude Code ou Codex com suporte a plugins.

**Claude Code** — execute no terminal:

```sh
claude plugin marketplace add matfmc/camarabr
claude plugin install camarabr@camara-dados-abertos
```

**Codex** — execute no terminal:

```sh
codex plugin marketplace add matfmc/camarabr
codex plugin add camarabr@camara-dados-abertos
```

Depois da instalação, abra uma nova conversa no cliente escolhido.
Para instalar no **Cowork** ou pelo **app Codex**, siga o [passo a passo](MANUAL.md).

## Manual rápido

1. Abra uma conversa no Claude ou no Codex com o plugin instalado.
2. Diga o que quer consultar, informando o nome, número do projeto ou período.
3. Peça um relatório ou uma exportação para CSV quando precisar salvar os resultados.

Experimente:

> Faça um relatório completo da deputada Tabata Amaral em 2025.

> Como está a tramitação do PL 2338/2023?

> Ranking dos 10 deputados que mais gastaram de cota parlamentar em 2025.

> Exporte para CSV a lista de deputados em exercício, com partido e estado.

Veja o [manual completo](MANUAL.md) para mais exemplos, instalação guiada, atualização e solução de problemas.

---

[Detalhes do plugin](plugins/camarabr/README.md) · [Guia de desenvolvimento](DESENVOLVIMENTO.md) ·
[Histórico de versões](plugins/camarabr/CHANGELOG.md) · [Licença MIT](LICENSE)
