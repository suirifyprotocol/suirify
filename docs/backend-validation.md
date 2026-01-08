# Backend Validation Patterns

For sensitive flows, validate claims server-side.

---

## Pattern

1. Client sends:
   - wallet
   - attestationId
   - signed consent message
2. Server verifies:
   - signature
   - consent timestamp
   - attestation still valid