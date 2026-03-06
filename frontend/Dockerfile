FROM node:22-alpine3.22

WORKDIR /app

# Pull patched Alpine security packages and current npm toolchain
# so Trivy image scans don't fail on stale base/tooling CVEs.
RUN apk upgrade --no-cache \
    && npm install -g npm@latest

COPY package*.json ./
RUN npm install

COPY . .

CMD ["npm", "start"]
