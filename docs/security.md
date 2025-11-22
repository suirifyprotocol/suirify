# Security Guidelines

## Core Rules

- SDK is read-only
- Issuance keys stay backend-only
- No PII stored on-chain
- No PII stored in frontend

---

## Backend Storage Rules

- Avoid storing hashed names unless required
- Use KMS/HSM for issuer keys
- Encrypt logs and disable debug logs in prod
