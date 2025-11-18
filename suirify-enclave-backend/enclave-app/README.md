# Suirify Enclave Image

This directory contains the minimal Node.js service that runs inside the Nitro Enclave. The container image is used as the input for `nitro-cli build-enclave`, which turns it into an Enclave Image File (EIF).

## Prerequisites

- Docker 24+
- AWS Nitro CLI installed on the parent EC2 instance (`sudo yum install -y nitro-cli`)
- `ENCLAVE_PRIVATE_KEY_B64` environment variable (base64 encoded 32-byte key that matches the key registered on-chain)

## Build the container image

```bash
cd suirify-enclave-backend/enclave-app
# Optional: override NODE_VERSION build arg
DOCKER_BUILDKIT=1 docker build -t suirify-enclave:latest .
```

## Build an EIF

The repository ships with `scripts/build-enclave-image.sh` to automate the process. Run it from the repo root on the parent instance:

```bash
cd suirify-enclave-backend
chmod +x scripts/build-enclave-image.sh
scripts/build-enclave-image.sh --image suirify-enclave:latest --output out/suirify-enclave.eif
```

Outputs:
- `out/suirify-enclave.eif`: the enclave artifact
- `out/suirify-enclave.measurements.json`: PCR values to register on-chain

Pass `--debug` if you need a debug EIF (PCRs will be zeroed and **must not** be used in production).

## Running locally (non-enclave)

You can run the service in a regular container for smoke testing:

```bash
docker run --rm -e ENCLAVE_PRIVATE_KEY_B64=base64key suirify-enclave:latest
```

The service listens on VSOCK port `5000` by default. In a standard Nitro deployment, the parent app connects over VSOCK to relay signing requests.
