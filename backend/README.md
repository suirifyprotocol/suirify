# Suirify Backend

Core backend for the Suirify Protocol with optional Nautilus Enclave support.

## Features

- Identity verification and attestation minting
- Face verification with liveness detection
- Government ID validation
- Optional AWS Nitro Enclave (Nautilus) integration for enhanced security
- Fallback to legacy minting when enclave is not configured

## Installation

```bash
npm install
```

## Configuration

Copy `.env.example` to `.env` and configure the required environment variables:

```bash
cp .env.example .env
```

### Required Configuration

- `PACKAGE_ID`: Sui package ID for the protocol
- `ADMIN_CAP_ID`: Admin capability object ID
- `PROTOCOL_CONFIG_ID`: Protocol configuration object ID
- `ATTESTATION_REGISTRY_ID`: Attestation registry object ID
- `ADMIN_PRIVATE_KEY`: Private key for the admin/sponsor account (pays gas fees)
- `SECRET_PEPPER`: Secret value for name hashing

### Nautilus Enclave Configuration (Optional)

For enhanced security using AWS Nitro Enclaves:

- `ENCLAVE_CONFIG_ID`: On-chain enclave configuration object ID
- `ENCLAVE_OBJECT_ID`: On-chain registered enclave object ID
- `ENCLAVE_CID`: Enclave context ID (default: 3)
- `ENCLAVE_PORT`: Enclave VSOCK port (default: 5000)

**Note:** If enclave configuration is not provided, the backend will automatically fall back to the legacy direct minting approach.

## Nautilus Enclave Integration

The Nautilus integration provides an additional layer of security by:

1. Isolating the sensitive signing operation in a secure AWS Nitro Enclave
2. Communicating with the enclave via VSOCK (secure inter-process communication)
3. Using BCS (Binary Canonical Serialization) for payload serialization
4. Requiring on-chain verification of enclave signatures

### Architecture

```
Frontend → Backend (Parent App) → Enclave (via VSOCK) → Smart Contract
           ↓ (pays gas)           ↓ (signs payload)
           Sui Blockchain
```

The parent app (this backend):
- Validates user data
- Serializes the mint payload using BCS
- Sends it to the enclave for signing
- Constructs and submits the Sui transaction with the enclave signature

The enclave app (separate):
- Holds the sensitive signing key
- Signs the payload
- Returns the signature via VSOCK

### Deployment Options

**Without Enclave (Development/Testing):**
1. Don't set `ENCLAVE_CONFIG_ID` and `ENCLAVE_OBJECT_ID`
2. Backend will use direct minting (less secure but simpler)

**With Enclave (Production):**
1. Deploy the enclave app in an AWS Nitro Enclave
2. Configure all enclave environment variables
3. Backend will use enclave-based minting automatically

## Running

Development mode with auto-reload:
```bash
npm run dev
```

Production mode:
```bash
npm start
```

## Health Check

```bash
curl http://localhost:4000/health
```

## API Endpoints

- `GET /health` - Health check
- `GET /countries` - List supported countries
- `GET /attestation/:walletAddress` - Check attestation status
- `POST /start-verification` - Begin verification process
- `POST /complete-verification` - Complete verification
- `POST /face-verify` - Verify face match
- `POST /finalize-mint` - Finalize attestation minting (with or without enclave)
- `GET /mint-config` - Get minting configuration
- `GET /mint-request/:walletAddress` - Check mint request status

## Security Notes

- The `ADMIN_PRIVATE_KEY` is used ONLY for paying gas fees, NOT for signing attestation data
- When using the enclave, the actual signing key is isolated in the secure enclave
- The enclave's private key should NEVER be accessible to the parent app
- Use strong values for `SECRET_PEPPER` and `ADMIN_API_KEY`

## License

GPL-3.0
