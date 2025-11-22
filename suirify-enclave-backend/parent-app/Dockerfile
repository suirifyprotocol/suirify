# syntax=docker/dockerfile:1.6

FROM node:20.11-bullseye-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install

FROM node:20.11-bullseye-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Runtime image keeps only what we need to serve the parent API
FROM node:20.11-bullseye-slim AS runner
ENV NODE_ENV=production
WORKDIR /app

# Add a non-root user for better isolation
RUN useradd --create-home --uid 10001 nodeapp

# Copy application files and pre-built node_modules from the deps stage
COPY --from=builder /app /app

# Create directory for the database file and set permissions
# This ensures the 'nodeapp' user can write to db.json
RUN mkdir -p /app/data

RUN chown -R nodeapp:nodeapp /app

# Set the user to the non-root user
USER nodeapp

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4000/health', (res) => { if (res.statusCode !== 200) { process.exit(1); } process.exit(0); }).on('error', (err) => process.exit(1));"

CMD ["node", "index.js"]