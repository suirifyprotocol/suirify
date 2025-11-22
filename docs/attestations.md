# Suirify Attestations

Attestations represent verified identity claims.

## 🏷 Structure (Move Object)

`Suirify_Attestation {
id: UID,
owner: address,
issuer: address,
expiry: u64,
is_human_verified: bool,
is_over_18: bool,
jurisdiction: String,
verification_level: u8
}`

## 🔍 Public Fields

These may be read by any dApp:

- `is_human_verified`
- `is_over_18`
- `verification_level`
- `expiry`

## ❗ Non-Public (private backend logic)

- Name hash
- Verification metadata
