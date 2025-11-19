# syntax=docker/dockerfile:1.6

# Install production dependencies (including native vsock module) in a builder layer
FROM node:20.11-bullseye-slim AS deps
WORKDIR /app
RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential python3 \
    && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY . .

# Runtime image keeps only what we need to serve the parent API
FROM node:20.11-bullseye-slim AS runner
ENV NODE_ENV=production
WORKDIR /app

# Add a non-root user for better isolation
RUN useradd --create-home --uid 10001 nodeapp

# Copy application files and pre-built node_modules from the deps stage
COPY --from=deps /app /app
RUN chown -R nodeapp:nodeapp /app

USER nodeapp
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD node scripts/health_check.js || exit 1

CMD ["node", "index.js"]
