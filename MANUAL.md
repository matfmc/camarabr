# Manual rápido do CamaraBR

O CamaraBR deixa o Claude e o Codex consultar os dados públicos da Câmara dos Deputados: deputados, gastos da
cota parlamentar, projetos de lei e votações. Você pergunta em português e ele responde com os dados
oficiais. Não precisa de cadastro nem de chave.

---

## Onde funciona

| Onde | Funciona? |
|---|---|
| **Claude Code** (terminal, aba **Code** do app Claude, ou [claude.ai/code](https://claude.ai/code)) | Sim |
| **Cowork** (aba **Cowork** do app Claude, planos pagos) | Sim |
| **Codex** (app ou CLI com suporte a plugins e MCP local) | Sim |
| **Chat** (claude.ai ou aba **Chat** do app) | Não. O plugin precisa rodar um programa no computador, e o chat não faz isso. |

O ambiente que executa o plugin precisa ter o **Node.js 18 ou superior**
(veja [como instalar](#ou-faça-você-mesmo-3-passos), passo 1).

---

## Jeito mais fácil: cole este prompt (Claude Code)

Abra o Claude Code (no terminal ou na aba Code do app) e cole:

```text
Instale para mim o plugin CamaraBR, dos Dados Abertos da Câmara dos Deputados:
1. Confira se o Node.js 18 ou superior está instalado (node --version). Se não estiver, me diga o comando para instalar no meu sistema e pare aqui.
2. Rode: claude plugin marketplace add matfmc/camarabr
3. Rode: claude plugin install camarabr@camara-dados-abertos
4. Me diga se deu certo e o que eu faço para começar a usar.
```

Quando ele terminar, digite `/reload-plugins` (ou feche e abra o Claude Code de novo). Pronto.

---

## Ou faça você mesmo (3 passos)

**1. Tenha o Node.js 18 ou superior.** Digite `node --version` no terminal. Se der erro, instale:

- Windows: `winget install OpenJS.NodeJS.LTS`
- macOS: `brew install node`
- Ou baixe em [nodejs.org](https://nodejs.org) (versão LTS)

Depois de instalar, feche e abra o terminal.

**2. Instale o plugin.** No terminal:

```
claude plugin marketplace add matfmc/camarabr
claude plugin install camarabr@camara-dados-abertos
```

**3. Abra o Claude Code e pergunte.** Se ele já estava aberto, digite `/reload-plugins` antes.

---

## No Cowork

No Cowork não se usa o terminal: a instalação é feita pelos menus do app.

1. Instale o Node.js 18 ou superior no computador (passo 1 acima).
2. No app Claude, abra a aba **Cowork** e depois **Customize** → **Plugins**.
3. Adicione um marketplace a partir de um repositório e digite: `matfmc/camarabr`
4. Instale o plugin **CamaraBR** que aparece na lista.
5. Comece uma tarefa nova no Cowork e pergunte, usando os exemplos abaixo.

Se a sua empresa usa plano Enterprise, o administrador pode ter bloqueado plugins de fora ou servidores
locais. Nesse caso, peça a liberação a ele.

---

## No Codex

Com Node.js instalado, execute no terminal:

```
codex plugin marketplace add matfmc/camarabr
codex plugin add camarabr@camara-dados-abertos
```

Abra uma conversa nova no Codex e faça uma das perguntas abaixo. No app, você também pode instalar
o CamaraBR no catálogo de plugins depois de adicionar o marketplace.

Se preferir pedir a instalação ao Codex, cole:

```text
Instale para mim o plugin CamaraBR:
1. Confira se Node.js 18 ou superior e o comando codex plugin estão disponíveis.
2. Adicione o marketplace: codex plugin marketplace add matfmc/camarabr
3. Instale: codex plugin add camarabr@camara-dados-abertos
4. Confira o resultado e me oriente a abrir uma conversa nova para usar o plugin.
```

Para atualizar, execute `codex plugin marketplace upgrade camara-dados-abertos` e depois
`codex plugin add camarabr@camara-dados-abertos`. Abra uma conversa nova.
Se `codex plugin` não existir, atualize o Codex. Esta instalação usa o ambiente local do Codex.

---

## O que perguntar

Copie, troque o nome, número ou ano, e cole.

**Sobre um deputado**

```text
Faça um relatório completo da deputada Tabata Amaral em 2025.
```

```text
Quanto o deputado Nikolas Ferreira gastou de cota parlamentar em 2025, e com o quê?
```

**Sobre um projeto de lei**

```text
Como está a tramitação do PL 2338/2023? Onde ele está parado agora?
```

```text
Quais projetos sobre inteligência artificial foram apresentados em 2025?
```

**Sobre votações**

```text
Como cada partido votou na reforma tributária? Quem votou contra a orientação do próprio partido?
```

```text
Quais foram as votações nominais no plenário na última semana?
```

**Sobre gastos em geral**

```text
Ranking dos 10 deputados que mais gastaram de cota parlamentar em 2025.
```

```text
Quanto cada partido gastou de cota em 2025, em média por deputado?
```

**Para gerar planilhas**

```text
Exporte para Excel a lista de todos os deputados em exercício, com partido e estado.
```

```text
Exporte para CSV todas as PECs apresentadas em 2024.
```

Os arquivos vão para a pasta `dados/` da pasta em que você está trabalhando.

---

## Dicas

- **Diga o ano.** "Gastos em 2025" dá resposta mais certa que "gastos recentes".
- **Nome completo ajuda.** Se houver dois deputados parecidos, o assistente pergunta qual é.
- **Perguntas grandes funcionam.** Por exemplo: "Quais deputados de SP mais votaram contra o partido este
  ano e quanto gastaram de cota?". O assistente divide a pesquisa em consultas.
- **Atalhos opcionais no Claude Code:** `/camarabr:relatorio-deputado`, `/camarabr:relatorio-proposicao`,
  `/camarabr:relatorio-votacao`, `/camarabr:analise-despesas` e `/camarabr:extrair-dados`. Não é preciso
  usar; perguntar normalmente já aciona o mesmo. No Codex, pergunte normalmente ou selecione a skill.
- **Gasto alto não é irregularidade.** Os relatórios mostram os números e a fonte, sem julgar.

---

## Se algo der errado

| O que acontece | O que fazer |
|---|---|
| `node` não é reconhecido | Instale o Node.js (passo 1) e abra o terminal de novo. |
| O Claude não usa os dados da Câmara | Digite `/reload-plugins`. Depois `/mcp` e veja se o servidor `camara` aparece conectado. |
| O Codex não usa os dados da Câmara | Confira se o plugin está instalado e habilitado e abra uma conversa nova. No CLI, veja o servidor com `/mcp`. |
| `claude` não é reconhecido no terminal | Falta o Claude Code. Instale seguindo [code.claude.com](https://code.claude.com). |
| Votação sem lista de quem votou | Foi votação simbólica: a Câmara não registra votos individuais nesse caso. |
| Quero a versão mais nova | `claude plugin update camarabr@camara-dados-abertos` |

Para usar pelo navegador em [claude.ai/code](https://claude.ai/code), veja
[Usar pela web](plugins/camarabr/README.md#usar-pela-web-claude-code-na-web).

Dúvidas ou erros: [abra uma issue](https://github.com/matfmc/camarabr/issues).
