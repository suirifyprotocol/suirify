# syntax=docker/dockerfile:1.6

FROM amazonlinux:2023 AS base

# Install Node.js 20 natively on Amazon Linux 2023
RUN yum update -y && \
    yum install -y nodejs20 npm gcc-c++ make shadow-utils && \
    yum clean all && \
    rm -rf /var/cache/yum

WORKDIR /app
ENV NODE_ENV=production \
    VSOCK_PORT=5000

FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev

FROM base AS runner
LABEL org.opencontainers.image.source="https://github.com/suirifyprotocol/suirify" \
      org.opencontainers.image.description="Suirify enclave runtime image" \
      org.opencontainers.image.licenses="GPL-3.0"

ARG ENCLAVE_PRIVATE_KEY
ENV ENCLAVE_PRIVATE_KEY=${ENCLAVE_PRIVATE_KEY}

RUN useradd --system --uid 10001 --create-home enclave

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN chown -R enclave:enclave /app

USER enclave
EXPOSE 5000

CMD ["node", "enclave.js"]