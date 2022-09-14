FROM node:16-alpine
RUN mkdir /app && chown -R node:node /app
COPY --chown=node ["package*.json", "/app/"]
USER node
WORKDIR /app

ENV NODE_ENV production
RUN npm ci && npm cache clean --force
COPY --chown=node [".", "/app/"]

ENTRYPOINT [ "node", "server.js" ]
