# Suirify SDK Integration Guide

> This guide helps you install, configure, and integrate the Suirify Attestation SDK. It covers SDK usage (`sdk/`) and practical wiring (as in `DemoApp/`) to help you build a production-ready, consent-first attestation flow.

---

## 1. Overview

The Suirify SDK enables your dApp (React/Node) to read attestation objects from a Sui fullnode, with user consent at every step:

1. Your app requests attestation data from the Sui fullnode (e.g., via `getOwnedObjects`).
2. The SDK asks your app to show a consent modal for each scope (e.g., `attestation_lookup`, `is_human_verified`).
3. The user signs a message in their Sui wallet.
4. The SDK returns attestation metadata and public claims for gating features.

**Note:** The SDK is read-only and never writes to the chain.

---

## 2. Prerequisites

| Requirement        | Notes                                                         |
| ------------------ | ------------------------------------------------------------- |
| Node.js ≥ 18       | Required for SDK and Mysten Dapp Kit                          |
| HTTPS Sui RPC      | Default: `https://fullnode.devnet.sui.io:443`                 |
| Wallet integration | Use Mysten Dapp Kit or any library with `signPersonalMessage` |
| Build tooling      | Vite, Next.js, etc. (TypeScript recommended)                  |

**Environment variables:**

```env
# .env
SUI_RPC_URL=https://fullnode.devnet.sui.io:443
SUIRIFY_PACKAGE_ID=0x3c71db613cf881d906cbe28739e9e4d932fff569fb67cb1a329a633337234f74
SUIRIFY_ATTESTATION_TYPE=0x3c71db613cf881d906cbe28739e9e4d932fff569fb67cb1a329a633337234f74::protocol::Suirify_Attestation # optional
```

In frontend frameworks, use Vite-style `VITE_` prefixes (e.g., `VITE_SUI_RPC_URL`).

---

## 3. Quick Integration Checklist

1. Create a `.env` file with the variables above.
2. Install `suirifysdk` and ensure your bundler can resolve the local `sdk/` workspace if consuming directly.
3. Instantiate a singleton `SuirifySdk` as your app boots (e.g., in `src/lib/suirifyClient.ts`).
4. Register a consent handler before any SDK calls.
5. Call `getAttestationForOwner` when a wallet connects, then request claims as needed.
6. Cache results in app state (context, redux, etc.) for synchronous access.
7. Provide a manual refresh button to clear caches and re-run the flow.

---

bash
bash

## 4. Installation

**Published package:**

```bash
npm install suirifysdk
# or, when published as @suirify/sdk:
# npm install @suirify/sdk
```

**Local workspace (DemoApp):**

In `DemoApp/package.json`:

```json
"dependencies": {
  "suirifysdk": "file:../sdk"
}
```

Then run:

```bash
npm install
```

---

typescript

## 5. Instantiate the Client

Create a file to initialize and export the SDK singleton:

```typescript
// src/lib/suirifyClient.ts
import { SuirifySdk } from "suirifysdk";

const rpcUrl =
  window?.SUI_RPC_URL ||
  import.meta.env.VITE_SUI_RPC_URL ||
  "https://fullnode.devnet.sui.io:443";

const attestationType =
  window?.SUIRIFY_ATTESTATION_TYPE ||
  import.meta.env.VITE_SUIRIFY_ATTESTATION_TYPE ||
  (import.meta.env.VITE_SUIRIFY_PACKAGE_ID
    ? `${
        import.meta.env.VITE_SUIRIFY_PACKAGE_ID
      }::protocol::Suirify_Attestation`
    : undefined);

export const suirifyClient = new SuirifySdk({
  rpcUrl,
  attestationType,
  cacheMs: 5000,
});
```

**Options:**

- `rpcUrl`: HTTPS fullnode endpoint
- `attestationType`: Optional struct type (defaults to `${PACKAGE_ID}::protocol::Suirify_Attestation`)
- `cacheMs`: Cache TTL for lookups

---

typescript
typescript

## 6. Register a Consent Handler

The SDK is UI-agnostic. You must provide a handler that shows scopes to users and returns a boolean after wallet signature.

```typescript
suirifyClient.setConsentHandler(async (scopes) => {
  const approved = await openConsentModal(scopes); // render UI + wallet signature
  return approved; // false rejects the SDK call
});
```

**React pattern:**

1. Store scopes in state and open a `<ConsentModal />`.
2. On "Approve & Sign", compose a message:

```typescript
const message = [
  "Suirify Verified Launchpad is asking for your consent to:",
  scopes.map((s) => `• ${describeScope(s)}`).join("\n"),
  "",
  `Wallet: ${walletAddress}`,
  `Timestamp: ${new Date().toISOString()}`,
].join("\n");
await signPersonalMessage({ message: new TextEncoder().encode(message) });
```

**Scopes:**

- `attestation_lookup` (before any RPC call)
- Public claim fields: `is_human_verified`, `is_over_18`, `verification_level`, `expiry_time_ms`, `revoked`

**UX Tips:**

- Keep modal copy deterministic (use helpers like `describeScope`)
- Include wallet address and timestamp in the signed payload
- Return `false` if signature fails (prevents retries)
- Localize modal text as needed
- For mobile wallets, store the pending resolver in a ref

---

typescript

## 7. Discover an Attestation

```typescript
const result = await suirifyClient.getAttestationForOwner(walletAddress);
if (!result.found) {
  // Redirect to onboarding (e.g., https://devnet.suirify.com)
}

const validity = await suirifyClient.isValid(result.attestation!);
if (!validity.valid) {
  // Show reason (revoked / expired / wrong status)
}
```

**React Query example:**

```typescript
const { data, isFetching, error } = useQuery({
  queryKey: ["attestation", walletAddress],
  queryFn: () => (walletAddress ? fetchAttestationStatus(walletAddress) : null),
  staleTime: 30000,
});
```

Trigger this fetch in a `useEffect` that depends on `walletAddress` and network. Clear cached claims on account switch to avoid stale states.

---

typescript

## 8. Request Public Claims

```typescript
const claims = await suirifyClient.getPublicClaims(walletAddress, [
  "is_human_verified",
  "is_over_18",
  "verification_level",
  "expiry_time_ms",
]);
if (claims.is_human_verified) {
  unlockAllowlist();
}
```

**Best practices:**

- Cache claims in state/context for synchronous rendering
- For backend gating, send attestation object ID + signed consent to your server and re-run `getPublicClaims`

---

tsx

## 9. Build a Verification Provider (React)

See `DemoApp/src/context/VerificationContext.tsx` for a reusable pattern:

- Wallet detection (e.g., Mysten Dapp Kit's `useCurrentAccount()`)
- Status machine: derive `idle` | `loading` | `verified` | `unverified` | `error`
- Consent UI: store consent fields, open/close modal, expose `approveConsent()`/`rejectConsent()`
- Gating: expose `requireVerification()` for feature modules
- Refresh: expose `refresh()` to clear cache and re-run queries

**Router example:**

```tsx
<QueryClientProvider client={queryClient}>
  <SuiClientProvider ...>
    <SuiWalletProvider autoConnect>
      <VerificationProvider>
        <AppRoutes />
      </VerificationProvider>
    </SuiWalletProvider>
  </SuiClientProvider>
</QueryClientProvider>
```

You can port this to other state managers (e.g., Next.js App Router, Vue + Pinia).

---

typescript

## 10. Customizing Requested Fields

You can:

- Pass fields per call: `client.getPublicClaims(address, myFields)`
- Store an array in config/env and feed it into your verification context

```typescript
const CLAIM_FIELDS: ClaimField[] = (
  import.meta.env.VITE_SUIRIFY_CLAIMS?.split(",") ?? [
    "is_human_verified",
    "is_over_18",
  ]
).filter(Boolean) as ClaimField[];
```

Update both request and consent copy to reuse `CLAIM_FIELDS` so users see exactly what will be shared.

---

## 11. Mock & Fallback Strategy

- `VITE_SUIRIFY_FORCE_MOCK="true"` — always use the deterministic mock DB
- `VITE_SUIRIFY_ENABLE_MOCK_FALLBACK="false"` — disable fallback on SDK errors

Mock data lives in `DemoApp/src/lib/suirifyApi.ts` and supports deterministic addresses (e.g., `0xVerifiedLaunchpad`, any address ending in `777`).

---

## 12. Security & Privacy Guidelines

- Never store personal data or non-public claim fields off-chain
- Persist only wallet address, attestation object ID, verification level, expiry, and revocation flag
- Always show a human-readable consent message before requesting signatures
- Serve the SDK and RPC over HTTPS
- Consider rate limiting and retry logic at scale

---

## 13. Putting It All Together

1. Install `suirifysdk` and instantiate a client
2. Register a consent handler and render a modal for wallet signature
3. Detect attestations with `getAttestationForOwner` and `isValid`
4. Request claims with `getPublicClaims` after user approval
5. Gate features using returned claims
6. Expose a refresh button to re-run the flow

With these steps, you can reproduce the full Verified Launchpad experience or adapt the SDK to any product needing consent-first, attestation-gated interactions on Sui.

For API details, see `sdk/docs/API.md` and use `sdk/src/examples/web-demo` as a reference.

---

## Appendix: End-to-End Flow Example

1. Wallet connects → verification provider calls `suirifyClient.setConsentHandler(...)` and starts attestation query
2. SDK requests lookup consent → modal appears, user signs, handler resolves `true`
3. `getAttestationForOwner` completes → store `attestationId` + `objectDigest` in context
4. Validity check → call `isValid`; if revoked/expired, show remediation CTAs
5. Claims request → pass curated field list; SDK reuses or re-prompts for consent
6. UI gating → components call `requireVerification()` before sensitive actions
7. (Optional) Server confirmation → send `{ walletAddress, attestationId }` to backend and re-run `getPublicClaims`
8. User refreshes → clicking "Refresh verification" triggers `client.clearCache()` and re-executes the flow

Following this script ensures a consistent, secure, and user-friendly experience across web, mobile, and server-side integrations.

```

```
