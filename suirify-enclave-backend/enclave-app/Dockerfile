# syntax=docker/dockerfile:1.6

FROM amazonlinux:2023 AS base

# Install Node.js 20 and SOCAT
RUN yum update -y && \
    yum install -y nodejs20 npm gcc-c++ make shadow-utils socat && \
    yum clean all && \
    rm -rf /var/cache/yum

WORKDIR /app
ENV NODE_ENV=production

FROM base AS deps
WORKDIR /app
COPY package*.json ./
# Remove vsock from dependencies if present in package.json, or just install
RUN npm uninstall vsock && npm ci --omit=dev

FROM base AS runner
ARG ENCLAVE_PRIVATE_KEY
ENV ENCLAVE_PRIVATE_KEY=${ENCLAVE_PRIVATE_KEY}

RUN useradd --system --uid 10001 --create-home enclave

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN chown -R enclave:enclave /app

USER enclave

# No EXPOSE needed for Nitro Enclave
# The internal app is on 3000, VSOCK is 5000.

# 1. Start Node app in background (listening on TCP 3000)
# 2. Start socat to listen on VSOCK 5000 and forward to TCP 3000
CMD node enclave.js & \
    socat VSOCK-LISTEN:5000,fork,reuseaddr TCP:127.0.0.1:3000