# Frontend Integration Guide

This guide helps integrate Suirify into any React/Vue/Svelte dApp.

---

## Basic Flow

1. User connects wallet
2. Call `getAttestationForOwner`
3. If attestation exists → show gated features
4. If claims needed → trigger consent modal
5. Read claims via `getPublicClaims`

---

## Recommended Architecture

- `hooks/useSuirify.ts` — wrap SDK
- `context/SuirifyContext.ts` — provide state
- `components/ConsentModal.tsx` — modal UI
