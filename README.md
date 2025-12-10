# Suirify Sovereign Identity Protocol

![Suirify Logo](suirifyLogo.png)

[![CI](https://github.com/suirifyprotocol/suirify/actions/workflows/ci.yml/badge.svg)](https://github.com/suirifyprotocol/suirify/actions)
[![npm](https://img.shields.io/npm/v/suirify-sdk?label=npm)](https://www.npmjs.com/package/@suirify/suirifysdk)

**Suirify** is a privacy-first sovereign identity protocol built on the Sui blockchain. We enable _verify once, use everywhere_ with consent-first, on-chain attestation objects that let dApps gate features without storing personal data.

---

## 📎 Quick Links

- [Repository](https://github.com/suirifyprotocol/suirify)
- [Live Demo](https://demoapp-gg11.onrender.com)
- [Devnet Portal](https://devnet.suirify.com)
- [Documentation & Wiki](./docs/README.md)
- Contact: hello@suirify.com

---

## 🚀 Why Suirify?

- **Privacy-first:** PII is processed in memory, then deleted; apps read only sanitized public claims.
- **Reusable credentials:** One verification issues an on-chain attestation users can present across dApps.
- **Compliance-friendly:** Auditable attestations enable compliant DeFi, KYC gating, and age checks.
- **Designed for emerging markets:** First focus: Nigeria (NIN), then scale globally.

---

## 🏁 Quickstart (Run Demo Locally)

1. **Clone the repository**

```bash
git clone https://github.com/suirifyprotocol/suirify
cd suirify
```

2. **Install dependencies** (Node.js >= 18 recommended)

```bash
npm install
```

3. **Run the demo app**

```bash
cd DemoApp
npm install
npm run dev
# Open the URL printed by the Vite dev server
```

Full deployment and production instructions (keys, webhook security, CI) are in [docs/README.md](./docs/README.md) and the project Wiki.

---

## 🛠️ What You Can Build with Suirify

- Verified-only applications, launchpads, and token pre-sales
- KYC-gated applications
- Sybil-resistant social platforms and governance
- Age-restricted content and on-chain identity primitives
- ...and much more!

---

## 📖 Table of Contents

- [Overview](#overview)
- [Getting Started](#getting-started)
- [SDK Quickstart](#sdk-quickstart)
- [Demo (Verified Launchpad)](#demo--verified-launchpad)
- [Configuration & Environment](#configuration--environment)
- [Consent Handler Pattern](#consent-handler-pattern)
- [API / SDK Reference](#api--sdk-reference)
- [Security & Privacy](#security--privacy)
- [FAQ](#faq)
- [Contributing](#contributing)
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

## Getting Started

See the [Quickstart](#quickstart-run-demo-locally) above, or follow these steps for local development:

1. **Clone the repository**

```bash
git clone https://github.com/suirifyprotocol/suirify
cd suirify
```

2. **Install dependencies**

```bash
npm install
```

3. **Start the demo app**

```bash
cd DemoApp
npm install
npm run dev
```

---

## SDK Quickstart

- Create a singleton `SuirifySdk` client with your `SUI_RPC_URL` and optional `SUIRIFY_ATTESTATION_TYPE`.
- Register a `consentHandler` in your app that opens a modal asking the user to sign a consent message.
- On wallet connect:
  - Call `getAttestationForOwner(address)`
  - If found, call `getPublicClaims(address, fields)` after consent
- Cache claims in your app state and gate UI interactions.
- For high-value flows, always re-validate server-side.

See [`docs/API.md`](./docs/API.md) for the full API reference and method signatures.

---

## Demo — Verified Launchpad

The DemoApp showcases:

- Project listings (public teaser + hidden gated details)
- Wallet connect and attestation discovery
- Consent modal pattern (user signs to authorize claims reads)
- Allowlist join, comment/vote, and simulated token claim flows (client-side/mocked)

Live demo: [https://demoapp-gg11.onrender.com](https://demoapp-gg11.onrender.com)

---

## Configuration & Environment

Create a `.env` (do not commit it) with these variables for local development:

```ini
SUI_RPC_URL=https://fullnode.devnet.sui.io:443
SUIRIFY_PACKAGE_ID=0xecd5a7ed68fce7a16251eecb72e75df9f8b26fe77d4609056a3c41a543a59b99
SUIRIFY_ATTESTATION_TYPE=0xecd5a7ed68fce7a16251eecb72e75df9f8b26fe77d4609056a3c41a543a59b99::protocol::Suirify_Attestation

VITE_SUI_RPC_URL=...
VITE_SUIRIFY_FORCE_MOCK=false
```

`VITE_SUIRIFY_FORCE_MOCK` makes UI development possible without live attestations.

---

## Consent Handler Pattern

The SDK is UI-agnostic. You must implement and register:

```js
consentHandler(scopes: string[])
```

It should:

- Render a human-readable modal showing requested scopes
- Explain why the app needs them
- Prompt the user to sign a short message containing address + timestamp
- Resolve `true` or `false`

The SDK will abort the RPC read if the user denies consent. This pattern gives users control and creates an auditable consent record.

---

## API / SDK Reference

See [`docs/API.md`](./docs/API.md).

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
- Review [`docs/security.md`](./docs/security.md) for full hardening

---

## FAQ

**Q: Can the SDK issue attestations?**  
A: No. Issuance is performed by Suirify’s verification backend.

**Q: Can I store claim data?**  
A: Only store minimal non-PII fields (attestation ID, wallet, expiry, verification level).

See [`docs/faq.md`](./docs/faq.md) for more Q&A.

---

## Contributing

We welcome contributions! Open issues for feature requests and use pull requests for code changes.
See [`docs/contributing.md`](./docs/contributing.md) for guidelines and code of conduct.

---

## Contact

- Website: [https://devnet.suirify.com](https://devnet.suirify.com)
- Demo: [https://demoapp-gg11.onrender.com](https://demoapp-gg11.onrender.com)
- GitHub: [https://github.com/suirifyprotocol/suirify](https://github.com/suirifyprotocol/suirify)
- Email: hello@suirify.com

```

```
