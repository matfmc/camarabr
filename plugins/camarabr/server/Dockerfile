# Servidor MCP do CamaraBR em modo HTTP, para hospedar e usar como conector no claude.ai.
# O bundle dist/index.js já traz todas as dependências: não há npm install.
FROM node:22-alpine
WORKDIR /app
COPY dist/index.js ./index.js
ENV MCP_TRANSPORT=http PORT=3000
EXPOSE 3000
USER node
CMD ["node", "index.js"]
