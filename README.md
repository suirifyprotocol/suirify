# Suirify Sovereign Identity Protocol

![Suirify Logo](suirifyLogo.png)

[![CI](https://github.com/suirifyprotocol/suirify/actions/workflows/ci.yml/badge.svg)](https://github.com/suirifyprotocol/suirify/actions) [![npm](https://img.shields.io/npm/v/suirify-sdk?label=npm)](https://www.npmjs.com/package/@suirify/suirifysdk)
**Suirify** is a privacy-first sovereign identity protocol built on the Sui blockchain. We enable _verify once, use everywhere_ with consent-first, on-chain attestation objects that let dApps gate features without storing personal data.

---

## Quick links

- Repo: https://github.com/suirifyprotocol/suirify
- Live demo: https://demoapp-gg11.onrender.com
- Devnet portal: https://devnet.suirify.com
- Docs / Wiki: (see repository Wiki or `docs/` folder)
- Contact: hello@suirify.com

---

## Why Suirify?

Suirify solves Web3's identity friction by combining privacy and verifiability:

- **Privacy-first** — PII is processed in memory, then deleted; apps read only sanitized public claims.
- **Reusable credentials** — one verification issues an on-chain attestation users can present across dApps.
- **Compliance-friendly** — auditable attestations enable compliant DeFi, KYC gating, and age checks.
- **Designed for emerging markets** — first focus: Nigeria (NIN), then scale globally.

## Quickstart (run demo locally)

1. Clone the repo

```bash
git clone https://github.com/suirifyprotocol/suirify
cd suirify
```

2. Install dependencies (root / per workspace)

```bash
npm install
```

3. Run the demo app

```bash
cd DemoApp
npm install
npm run dev
# Open the URL printed by the Vite dev server
```

Full deployment instructions and production considerations (keys, webhook security, CI) live in **docs/README.md** and the project Wiki.

---

## What you can build with Suirify

- Verified-only Application, launchpads and token pre-sales
- KYC-gated Applications
- Sybil-resistant social platforms and governance
- Age-restricted content and on-chain identity primitives
- Many More...

---

## Contribute

We welcome contributors.  
See the `docs/` folder for contribution guidelines and the code of conduct.

---

````markdown
## Contents

- [Overview](#overview)
- [Getting started](#getting-started)
- [SDK Quickstart (conceptual)](#sdk-quickstart-conceptual)
- [Demo (Verified Launchpad)](#demo-verified-launchpad)
- [Configuration & Environment](#configuration--environment)
- [Consent handler pattern](#consent-handler-pattern)
- [API / SDK Reference (v1.0)](#api--sdk-reference-v10)
- [Security & Privacy](#security--privacy)
- [FAQ](#faq)
- [Contributing & Code of Conduct](#contributing--code-of-conduct)
- [Contact](#contact)

---

## Overview

Suirify issues non-transferable attestation objects on Sui that represent a verified identity claim.  
The SDK provides a read-only, consent-first interface for dApps to:

1. Discover whether a wallet owns a `Suirify_Attestation` on-chain.
2. Ask a user for consent to read public claims.
3. Read specific public claims (e.g., `is_human_verified`, `is_over_18`).
4. Gate UI or flows (allowlists, voting, token claim simulations) without handling PII.

This repo contains the SDK client code and an example Verified Launchpad demo showcasing common integration patterns.

---

## Getting started

See the repo root README for a short quickstart, or follow the steps below for a local development setup:

1. Clone the repository

```bash
git clone https://github.com/suirifyprotocol/suirify
cd suirify
```
````

2. Install dependencies (recommended: Node.js >= 18)

```bash
npm install
```

3. Start the demo app

```bash
cd DemoApp
npm install
npm run dev
```

---

## SDK Quickstart (conceptual)

- Create a singleton `SuirifySdk` client with your `SUI_RPC_URL` and optional `SUIRIFY_ATTESTATION_TYPE`.
- Register a `consentHandler` in your app that opens a modal asking the user to sign a consent message.
- On wallet connect:
  - call `getAttestationForOwner(address)`
  - if found, call `getPublicClaims(address, fields)` after consent
- Cache claims in your app state and gate UI interactions.
- For high-value flows, always re-validate server-side.

See `docs/API.md` for the full API reference and method signatures.

---

## Demo — Verified Launchpad

The DemoApp showcases:

- Project listings (public teaser + hidden gated details)
- Wallet connect and attestation discovery
- Consent modal pattern (user signs to authorize claims reads)
- Allowlist join, comment/vote, and simulated token claim flows (client-side/mocked)

Live demo: **https://demoapp-gg11.onrender.com**

---

## Configuration & Environment

Create a `.env` (do not commit it) with these variables for local development:

```ini
SUI_RPC_URL=https://fullnode.devnet.sui.io:443
SUIRIFY_PACKAGE_ID=0xfaad...your-package-id
SUIRIFY_ATTESTATION_TYPE=0xfaad...::protocol::Suirify_Attestation

VITE_SUI_RPC_URL=...
VITE_SUIRIFY_FORCE_MOCK=false
```

`VITE_SUIRIFY_FORCE_MOCK` makes UI development possible without live attestations.

---

## Consent handler pattern

The SDK is UI-agnostic.  
You must implement and register:

```
consentHandler(scopes: string[])
```

It should:

- Render a human-readable modal showing requested scopes
- Explain why the app needs them
- Prompt the user to sign a short message containing address + timestamp
- Resolve `true` or `false`

The SDK will abort the RPC read if the user denies consent.

This pattern gives users control and creates an auditable consent record.

---

## API / SDK Reference (v1.0)

See `docs/API.md` (linked soon).

Core client class and methods:

- `SuirifySdk(opts)` — constructor
- `setConsentHandler(handler)` — register app modal handler
- `getAttestationForOwner(address)` — discover attestation
- `getPublicClaims(address, fields)` — read public claims (requires consent)
- `isValid(attestation)` — revocation / expiry checks
- `clearCache(address?)` — clear cached results

---

## Security & Privacy

The client SDK is intentionally _read-only_.  
Production deployments must:

- Keep attester/issuer keys **server-side** (Vault / GCP KMS / AWS KMS)
- Use **server-side verification** for high-value flows
- Never commit `.env` or private keys
- Review `docs/Security.md` for full hardening

---

## FAQ

**Q: Can the SDK issue attestations?**  
A: No. Issuance is performed by Suirify’s verification backend.

**Q: Can I store claim data?**  
A: Only store minimal non-PII fields (attestation ID, wallet, expiry, verification level).

See `docs/FAQ.md` for more Q&A.

---

## Contributing & Code of Conduct

We welcome contributions.  
Open issues for feature requests and use pull requests for code changes.

See `docs/CONTRIBUTING.md`.

---

## Contact

Website: https://devnet.suirify.com  
Demo: https://demoapp-gg11.onrender.com  
GitHub: https://github.com/suirifyprotocol/suirify  
Email: hello@suirify.com

```

```
