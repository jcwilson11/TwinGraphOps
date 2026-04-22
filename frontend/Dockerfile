FROM node:22-alpine3.22 AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci --no-audit

COPY . .
RUN npm run build

FROM node:22-alpine3.22

WORKDIR /app

RUN apk upgrade --no-cache

COPY package*.json ./
RUN npm ci --omit=dev --no-audit \
    && npm cache clean --force \
    && rm -rf /root/.npm \
    && rm -rf /usr/local/lib/node_modules/npm \
    && rm -f /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack

COPY --from=build /app/dist ./dist
COPY server.js ./

USER node

CMD ["node", "server.js"]
