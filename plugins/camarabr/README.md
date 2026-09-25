# CamaraBR

Plugin do [Claude Code](https://code.claude.com) para consultar, extrair e gerar relatórios com os
[Dados Abertos da Câmara dos Deputados](https://dadosabertos.camara.leg.br/swagger/api.html):
deputados, despesas da cota parlamentar (CEAP), proposições, tramitações e votações.

Pergunte em linguagem natural, em português:

- "Faça um relatório do deputado Fulano em 2025"
- "Como está a tramitação do PL 2338/2023?"
- "Como cada partido votou na votação 2611313-31? Quem votou contra a orientação?"
- "Ranking de gastos da cota parlamentar por partido em 2025"
- "Exporte para CSV todas as PECs apresentadas em 2024"

## Requisitos

- Claude Code
- Node.js 18 ou superior. Confira com `node --version`. Se não tiver, instale a versão LTS em
  [nodejs.org](https://nodejs.org) ou pelo gerenciador de pacotes:
  - Windows: `winget install OpenJS.NodeJS.LTS`
  - macOS: `brew install node`
  - Linux: o pacote `nodejs` da sua distribuição (versão 18 ou superior)

Nenhuma chave de API ou cadastro é necessário: os dados são públicos.

## Instalação

No terminal:

```
claude plugin marketplace add matfmc/camarabr
claude plugin install camarabr@camara-dados-abertos
```

Ou, dentro de uma sessão do Claude Code:

```
/plugin marketplace add matfmc/camarabr
/plugin install camarabr@camara-dados-abertos
```

Depois é só perguntar. Para conferir se carregou, rode `/mcp` e procure o servidor `camara`.

### Atualizar

```
claude plugin update camarabr@camara-dados-abertos
```

Para receber atualizações automaticamente, ative o auto-update do marketplace `camara-dados-abertos`
na aba **Marketplaces** do comando `/plugin`.

## Usar pela web

### Claude Code na web (claude.ai/code)

As sessões rodam num contêiner na nuvem com Node, então o plugin funciona completo. Coloque no
`.claude/settings.json` do repositório que você abre na sessão:

```json
{
  "extraKnownMarketplaces": {
    "camara-dados-abertos": {
      "source": { "source": "github", "repo": "matfmc/camarabr" }
    }
  },
  "enabledPlugins": {
    "camarabr@camara-dados-abertos": true
  }
}
```

Se o ambiente da sessão estiver com acesso à rede limitado, libere `dadosabertos.camara.leg.br`
(e `www.camara.leg.br`, para os arquivos anuais da cota).

### Chat do claude.ai (conector personalizado)

O chat não instala plugins, mas aceita servidores MCP remotos como **conectores**. O servidor do
CamaraBR tem um modo HTTP para isso. Alguém hospeda uma vez e qualquer pessoa adiciona a URL.

**1. Hospedar o servidor.** Qualquer serviço que rode Docker ou Node 18+ com HTTPS serve (Render,
Railway, Fly.io, uma VPS…). O bundle `server/dist/index.js` não tem dependências externas.

- Com Docker, use o `Dockerfile` da pasta `plugins/camarabr/server`:
  ```
  docker build -t camarabr-mcp plugins/camarabr/server
  docker run -p 3000:3000 camarabr-mcp
  ```
- Sem Docker, o comando de início é `node dist/index.js --http`, a partir de `plugins/camarabr/server`.

Exemplo no Render: **New → Web Service**, conecte o repositório, escolha **Docker** como ambiente e
`plugins/camarabr/server` como **Root Directory**. O Render define a porta sozinho. No plano gratuito o
serviço hiberna sem uso, e a primeira chamada depois disso pode demorar ou falhar por tempo esgotado.

Variáveis aceitas:

| Variável | Padrão | Uso |
|---|---|---|
| `PORT` | `3000` | Porta HTTP |
| `HOST` | `0.0.0.0` | Interface de rede |
| `MCP_TRANSPORT` | — | `http` liga o modo HTTP (equivale a `--http`) |

Rotas: `POST /mcp` é o endpoint MCP (Streamable HTTP, sem sessão); `GET /` responde 200 para
verificações de saúde. Para conferir, abra `https://seu-servidor/` no navegador.

**2. Adicionar no claude.ai.** Em **Configurações → Conectores → Adicionar conector personalizado**,
dê um nome (ex.: CamaraBR) e cole a URL terminando em `/mcp`, por exemplo
`https://seu-servico.onrender.com/mcp`. Não há autenticação: os dados são públicos. Em planos Team e
Enterprise, quem administra a organização adiciona o conector para todos.

Diferenças em relação ao plugin local:

- São 10 ferramentas: `exportar_dados` fica de fora, porque gravaria o arquivo no disco do servidor.
  Para planilhas, peça ao Claude que monte o arquivo com os dados que as ferramentas devolvem.
- As skills e o subagente não vêm junto. Se quiser, envie as pastas de `skills/` como .zip em
  **Configurações → Capacidades → Skills**. `relatorio-*` e `dados-camara` funcionam só com o conector;
  `analise-despesas` (ranking da Casa inteira) e `extrair-dados` dependem de rodar scripts e baixar
  arquivos, o que pode não funcionar no chat.
- Quem hospeda vê as consultas que passam pelo servidor (quais deputados, projetos etc.), como em
  qualquer serviço web.

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

## Cuidados com os dados

- `/deputados/{id}/despesas` devolve vazio (sem erro) sem `idLegislatura`. O servidor preenche o parâmetro.
- `/proposicoes`, `/votacoes` e `/eventos` sem datas cobrem só os últimos 30 dias.
- O arquivo anual da cota não bate exatamente com a API: faltam passagens aéreas (SIGEPA) que a API já traz,
  sobretudo no ano corrente, mas também em anos fechados; e a telefonia funcional aparece só no arquivo.
  Para valores de um deputado específico, o plugin usa a API.
- Gasto alto não significa irregularidade. Os relatórios citam a fonte e evitam juízo de valor.

## Privacidade e rede

O plugin só acessa endereços públicos da Câmara dos Deputados:

- `dadosabertos.camara.leg.br` (API de Dados Abertos), pelo servidor MCP;
- `www.camara.leg.br/cotas/` (arquivos anuais da cota), baixados só quando você pede um ranking da
  Casa inteira, e com confirmação antes.

Não há telemetria, chaves ou envio de dados para terceiros. Arquivos exportados são gravados, por padrão,
na pasta do seu projeto.

## Problemas e sugestões

Abra uma issue em [github.com/matfmc/camarabr/issues](https://github.com/matfmc/camarabr/issues).

## Licença

MIT. Os dados são da Câmara dos Deputados e seguem a
[política de dados abertos](https://dadosabertos.camara.leg.br/) da Câmara.
