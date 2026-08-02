# Mimi Studio — sovereign-friendly Express host (SQLite volume or Postgres URL)
FROM node:22-bookworm-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

ENV NODE_ENV=production
ENV PORT=3000
ENV MIMI_SOVEREIGN_ENABLED=1
ENV MIMI_SOVEREIGN_DB=/data/sovereign.sqlite
# node:sqlite is stable enough for the sovereign archive on Node 22+
ENV NODE_OPTIONS=--disable-warning=ExperimentalWarning

EXPOSE 3000
VOLUME ["/data"]

CMD ["node", "dist/server.cjs"]
