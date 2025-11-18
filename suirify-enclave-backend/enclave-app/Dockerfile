# syntax=docker/dockerfile:1.6

ARG NODE_VERSION=20.11.0

FROM node:${NODE_VERSION}-bookworm-slim AS base
WORKDIR /app
ENV NODE_ENV=production \
	VSOCK_PORT=5000

FROM base AS deps
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev

FROM base AS runner
LABEL org.opencontainers.image.source="https://github.com/suirifyprotocol/suirify" \
	  org.opencontainers.image.description="Suirify enclave runtime image" \
	  org.opencontainers.image.licenses="GPL-3.0"

RUN useradd --system --uid 10001 --create-home enclave

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN chown -R enclave:enclave /app

USER enclave
EXPOSE 5000

HEALTHCHECK --interval=60s --timeout=5s --start-period=5s --retries=3 CMD node -e "process.exit(0)" || exit 1

CMD ["node", "enclave.js"]