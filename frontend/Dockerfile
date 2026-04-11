FROM node:22.22.0-alpine3.22 AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci --no-audit

COPY . .
RUN npm run build

FROM node:22.22.0-alpine3.22

WORKDIR /app

RUN apk upgrade --no-cache

COPY --from=build /app/dist ./dist
COPY server.js ./

CMD ["node", "server.js"]
