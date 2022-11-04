FROM node:18-alpine as base
RUN mkdir /app && chown -R node:node /app
COPY --chown=node ["package*.json", "tsconfig.json", "/app/"]
USER node
WORKDIR /app

FROM base as build
RUN npm ci
COPY --chown=node ["src", "/app/src"]
RUN npm run build

FROM base as prod
ENV NODE_ENV production
RUN npm ci && npm cache clean --force
COPY --chown=node --from=build ["/app/dist", "/app/dist"]
COPY --chown=node ["public", "/app/public"]

ENTRYPOINT [ "node", "dist/server.js" ]
