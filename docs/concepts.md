# Core Concepts Suirify

Suirify is a sovereign identity layer built on Sui, enabling privacy-preserving, non-transferable attestations users can present on-chain.

---

## 🧱 Identity Model

### Attestation Object

A Suirify attestation is:

- Non-transferable
- Wallet-owned
- Publicly readable (selective fields)
- Privacy-preserving (no PII stored on-chain)

### Verification Flow

1. User completes verification via Suirify backend.
2. Backend mints attestation on-chain.
3. dApps read public claims using the Suirify SDK.
4. Sensitive claims require user consent.

---

## 🔒 Privacy Principles

- Zero PII stored on-chain
- Name hashes salted with secret pepper
- Consent-first claim reads
- SDK is read-only; cannot mint
