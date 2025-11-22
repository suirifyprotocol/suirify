# syntax=docker/dockerfile:1.6

FROM amazonlinux:2023 AS base

# Install Node.js 20, SOCAT, and dos2unix
RUN yum update -y && \
    yum install -y nodejs npm gcc-c++ make shadow-utils socat dos2unix && \
    yum clean all && \
    rm -rf /var/cache/yum

WORKDIR /app
ENV NODE_ENV=production

FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm uninstall vsock && npm ci --omit=dev

FROM base AS runner
ARG ENCLAVE_PRIVATE_KEY
ENV ENCLAVE_PRIVATE_KEY=${ENCLAVE_PRIVATE_KEY}

# Create the enclave user
RUN useradd --system --uid 10001 --create-home enclave

# Copy node_modules
COPY --from=deps /app/node_modules ./node_modules

# Copy application source code
COPY . .

# Copy run script and set permissions
COPY run.sh /app/run.sh
RUN dos2unix /app/run.sh && chmod +x /app/run.sh

# Ensure permissions
RUN chown -R enclave:enclave /app

USER enclave

# Use the script as the entry point
CMD ["/app/run.sh"]