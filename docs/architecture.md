# Architecture Overview

Suirify operates through a hybrid architecture optimized for privacy, performance, and compliance.

---

## 🏗 System Diagram (High-Level)

````mermaid
flowchart TD
    User -->|Verify| Backend
    Backend -->|Mint Attestation| SuiChain
    dApp -->|Query| SDK
    SDK -->|RPC| SuiChain
    dApp -->|Consent| User
Components
1. Sui On-Chain Package
Attestation Move module

Helpers for claim reading

Jurisdiction policy modules

2. Backend Orchestrator
Off-chain verification

Attestation issuance

PII memory-only processing

3. SDK (Browser/Node)
Read-only access

Consent handler system

Typed claim readers

4. Demo Application
Launchpad example

Verification-gated interactions

yaml
Copy code

---

# 📁 `docs/sdk-quickstart.md`
```markdown
# SDK Quickstart

This guide helps you connect a wallet, detect attestations, and read claims.

---

## Install

npm install @suirify/suirifysdk

yaml
Copy code

---

## Initialize

```ts
import { SuirifySdk } from "@suirify/suirifysdk";

const sdk = new SuirifySdk({
  rpcUrl: import.meta.env.VITE_SUI_RPC_URL,
});
Register Consent Handler
ts
Copy code
sdk.setConsentHandler(async (scopes) => {
  return await openConsentModal(scopes);
});
Check Attestation
ts
Copy code
const att = await sdk.getAttestationForOwner(wallet.address);

if (!att) {
  console.log("User is not verified");
}
Read Public Claims
ts
Copy code
const claims = await sdk.getPublicClaims(wallet.address, ["is_over_18"]);
yaml
Copy code

---

# 📁 `docs/sdk-api.md`
```markdown
# SDK API Reference — v1.0

## Class: `SuirifySdk`

### Constructor
```ts
new SuirifySdk(opts: { rpcUrl: string })
Methods
setConsentHandler(fn)
Registers the UI flow for user consent.

getAttestationForOwner(address)
Reads attestation object ID + metadata for a wallet.

getPublicClaims(address, fields[])
Reads specific claims after consent.

isValid(attestation)
Checks expiry + revocation.

clearCache(address?)
Clears memoized RPC results.

yaml
Copy code

---

# 📁 `docs/consent-pattern.md`
```markdown
# Consent Handler Pattern

Suirify requires explicit user consent before reading certain claims.

---

## Required UX Flow

1. Explain requested scopes
2. User signs message (wallet prompt)
3. Return boolean to SDK

---

### Example Signature Payload

I authorize Suirify to read the following claims:

is_over_18
Timestamp: 171234123
Wallet: 0xabc...

yaml
Copy code

---

### Best Practices
- Display scope names clearly
- Include timestamp
- Cache consent only temporarily
````
