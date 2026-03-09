# Multi-stage Dockerfile for MnemonicShards
FROM node:22-alpine AS builder

WORKDIR /app

# Reproducible installs rely on the committed lockfile.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:22-alpine AS runtime

WORKDIR /app

RUN addgroup -S appgroup -g 1001 && \
    adduser -S appuser -u 1001 -G appgroup && \
    mkdir -p /app/dist && \
    chown -R appuser:appgroup /app

COPY --from=builder --chown=appuser:appgroup /app/dist ./dist
COPY --chown=appuser:appgroup tools/static-server.mjs ./static-server.mjs

USER appuser

EXPOSE 8848

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:8848/').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "static-server.mjs"]
