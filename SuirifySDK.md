# SUIrify SDK Integration Guide

This guide walks partner teams through installing, configuring, and embedding the SUIrify Attestation SDK end-to-end. It combines the primitives that live inside `sdk/` with the reference wiring used in `DemoApp/` so you can replicate the same production-ready flow in your own product.

---

## 1. Conceptual Overview

```
┌─────────────┐    RPC over HTTPS    ┌──────────────────────┐
│ Your dApp   │ <──────────────────► │ Sui Fullnode (devnet)│
│ (React/Node)│                      └──────────────────────┘
│             │         ▲
│             │         │    SUIrify_Attestation objects
│  Consent UI │         │
│  Wallet SIG │         ▼
│             │   ┌──────────────────────────────┐
│             │   │ SuirifySdk                  │
│             │   │ (sdk/dist)                   │
└─────────────┘   └──────────────────────────────┘
```

1. The SDK calls a Sui fullnode via `getOwnedObjects` / `getObject` to discover `Suirify_Attestation` objects.
2. Before each lookup/read it asks your app for consent scopes (`"attestation_lookup"`, `"is_human_verified"`, etc.).
3. Your UI shows a modal, the user signs a personal message in their Sui wallet, and you resolve the consent promise.
4. The SDK returns attestation metadata and public claim values which you can use to unlock gated features.

Nothing is ever written on-chain—this is a read-only, consent-first flow.

---

## 2. Prerequisites

| Requirement        | Notes                                                                                |
| ------------------ | ------------------------------------------------------------------------------------ |
| Node.js ≥ 18       | Matches the SDK toolchain and Mysten Dapp Kit requirements.                          |
| HTTPS Sui RPC      | Default is `https://fullnode.devnet.sui.io:443`. You may pass any fullnode URL.      |
| Wallet integration | Use Mysten Dapp Kit (as in DemoApp) or any library capable of `signPersonalMessage`. |
| Build tooling      | Vite/Next.js/etc. with TypeScript recommended.                                       |

Environment variables you will typically define:

```bash
# .env
SUI_RPC_URL=https://fullnode.devnet.sui.io:443
SUIRIFY_PACKAGE_ID=0xecd5a7ed68fce7a16251eecb72e75df9f8b26fe77d4609056a3c41a543a59b99
SUIRIFY_ATTESTATION_TYPE=0xecd5a7ed68fce7a16251eecb72e75df9f8b26fe77d4609056a3c41a543a59b99::protocol::Suirify_Attestation # optional override
```

In front-end frameworks, expose them via Vite-style `VITE_` prefixes (e.g., `VITE_SUI_RPC_URL`).

### Quick integration checklist

1. Create a `.env` file with the variables above (or equivalent config in your hosting stack).
2. Install `suirifysdk` and ensure your bundler can resolve the local `sdk/` workspace if you are consuming it directly.
3. Instantiate a singleton `SuirifySdk` as soon as your app boots (for example inside `src/lib/suirifyClient.ts`).
4. Register a consent handler before making any SDK calls so user prompts always render in time.
5. Call `getAttestationForOwner` as soon as a wallet connects, then request claims that match your product requirements.
6. Cache the result in your app state (context, redux, zustand, etc.) so any component can synchronously check verification status.
7. Provide a manual refresh button that clears caches and re-runs the flow so users can re-verify without reloading the page.

---

## 3. Installation

### Published package (coming soon)

```bash
npm install suirifysdk
```

### Local workspace example (DemoApp)

```jsonc
// DemoApp/package.json
"dependencies": {
  "suirifysdk": "file:../sdk"
}
```

After linking, run `npm install` so the SDK builds into your app’s node_modules.

---

## 4. Instantiate the client

```ts
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
  cacheMs: 5_000,
});
```

The constructor options:

- `rpcUrl`: HTTPS fullnode endpoint.
- `attestationType`: Optional explicit struct type. Defaults to `${PACKAGE_ID}::protocol::Suirify_Attestation`.
- `cacheMs`: In-memory cache TTL for lookup results.

### Client wiring steps

- **Create a dedicated module** (`suirifyClient.ts`) and export the singleton so every feature imports the same instance.
- **Inject runtime config**: prefer plain objects or dependency injection in server-rendered apps; in the browser you can read from `window` overrides (as shown) to support no-redeploy hot fixes.
- **Defer heavy work**: the constructor is cheap; network calls only happen when you invoke API methods, so you can import the client anywhere without performance penalties.
- **Server-side usage**: in Node/Edge runtimes call `new SuirifySdk({ rpcUrl: process.env.SUI_RPC_URL })` and reuse it between requests to take advantage of the cache.

---

## 5. Register a consent handler

The SDK is UI-agnostic. You must supply a handler that surfaces scopes to users and returns a boolean once the wallet signs.

```ts
// tie the client to your modal layer
suirifyClient.setConsentHandler(async (scopes) => {
  const approved = await openConsentModal(scopes); // render UI + wallet signature
  return approved; // false will reject the underlying SDK call
});
```

A practical React implementation (taken from `DemoApp/src/context/VerificationContext.tsx`):

1. When the SDK calls the handler, store the scopes in state and open a `<ConsentModal />`.
2. On “Approve & Sign”, compose a readable message:
   ```ts
   const message = [
     "SUIrify Verified Launchpad is asking for your consent to:",
     scopes.map((s) => `• ${describeScope(s)}`).join("\n"),
     "",
     `Wallet: ${walletAddress}`,
     `Timestamp: ${new Date().toISOString()}`,
   ].join("\n");
   await signPersonalMessage({ message: new TextEncoder().encode(message) });
   ```
3. Resolve the promise with `true` or `false` so the SDK can continue.

**Scopes**

- `"attestation_lookup"` – requested before any RPC call.
- Public claim fields – `"is_human_verified"`, `"is_over_18"`, `"verification_level"`, `"expiry_time_ms"`, `"revoked"`.

DemoApp automatically prepends `attestation_lookup` and caches the last approved scope hash to avoid repeated prompts.

### Consent UX pattern

- Keep the modal copy deterministic: build a helper such as `describeScope(scope)` so legal reviewers can version the text alongside code.
- Include the wallet address and timestamp in the signed payload; this gives downstream auditors a clear record of what was approved.
- Resolve the promise with `false` if the wallet signature fails—this prevents the SDK from retrying the underlying RPC and clearly surfaces “consent denied” states.
- Localize the modal by storing the scope descriptions in a translation file; the SDK always passes raw scope identifiers so they are safe to map.
- Mobile wallets often open external tabs; store the pending resolver in a ref so your modal can wait for the user to come back.

---

## 6. Discover an attestation

```ts
const result = await suirifyClient.getAttestationForOwner(walletAddress);
if (!result.found) {
  // Redirect users to SUIrify onboarding (e.g., https://devnet.suirify.com)
}

const validity = await suirifyClient.isValid(result.attestation!);
if (!validity.valid) {
  // Show reason (revoked / expired / wrong status)
}
```

In DemoApp we wrap this logic inside a React Query hook:

```ts
const { data, isFetching, error } = useQuery({
  queryKey: ["attestation", walletAddress],
  queryFn: () => (walletAddress ? fetchAttestationStatus(walletAddress) : null),
  staleTime: 30_000,
});
```

`fetchAttestationStatus` is a thin helper around the SDK plus an optional mock fallback for demo wallets.

**Lifecycle tip:** trigger this fetch inside a `useEffect` that depends on `walletAddress` and `network`. If the user switches accounts, immediately clear cached claims before the new query runs to avoid flashing stale verification states.

---

## 7. Request public claims

Once an attestation is valid, ask for individual claims:

```ts
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

The SDK enforces the consent handler before fulfilling this call. Tailor the requested fields to your use case—DemoApp exposes an environment flag (`VITE_SUIRIFY_FORCE_MOCK`) so engineers can iterate without live attestations.

**Best practice:** cache `claims` in React state/context so downstream components (allowlist button, gated cards, toasts) can render synchronously after approval.

If you need the exact same claims on a backend service (for example to gate API requests), send the attestation object ID plus signed consent message to your server and re-run `getPublicClaims` there. This keeps sensitive gating logic off the client and lets you add rate limiting or analytics.

---

## 8. Build a verification provider (React example)

`DemoApp/src/context/VerificationContext.tsx` demonstrates a reusable pattern:

1. **Wallet detection** – subscribe to Mysten Dapp Kit’s `useCurrentAccount()`.
2. **Status machine** – derive `"idle" | "loading" | "verified" | "unverified" | "error"` from the query results.
3. **Consent UI** – store `consentFields`, `consentOpen`, and expose `approveConsent()` / `rejectConsent()` to the modal component.
4. **Gating helper** – expose `requireVerification()` that either opens a prompt (“Connect wallet” / “Get verified”) or returns `true` so feature modules can guard actions without duplicating logic.
5. **Refresh** – expose `refresh()` that clears cached claims, re-runs the query, and re-reads claims if the status is still verified.

Wrap your router:

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

You can port the same architecture to other state managers. For example, in Next.js App Router expose a `VerificationContext` via a Client Component, or in Vue wrap the SDK inside a Pinia store that mirrors the `status`, `claims`, and `requireVerification` helpers described above.

---

## 9. Customizing requested fields

Platforms often need a subset of public claims. You can:

- Pass them per call: `client.getPublicClaims(address, myFields)`.
- Capture them in config: store an array in your .env or feature flag and feed it into your verification context so the consent modal and SDK stay in sync.

Example:

```ts
const CLAIM_FIELDS: ClaimField[] = (
  import.meta.env.VITE_SUIRIFY_CLAIMS?.split(",") ?? [
    "is_human_verified",
    "is_over_18",
  ]
).filter(Boolean) as ClaimField[];
```

Update both `requestClaims` and your consent copy to reuse `CLAIM_FIELDS` so users see exactly what will be shared.

---

## 10. Mock & fallback strategy

For local demos you can toggle:

- `VITE_SUIRIFY_FORCE_MOCK="true"` – always use the deterministic mock DB.
- `VITE_SUIRIFY_ENABLE_MOCK_FALLBACK="false"` – disable automatic fallback when the SDK throws (useful in staging).

The mock data lives in `DemoApp/src/lib/suirifyApi.ts` and supports deterministic addresses (e.g., `0xVerifiedLaunchpad`, any address ending in `777`). This keeps the UI functional without a live attestation.

---

## 11. Security & privacy guidelines

- Never store personal data or non-public claim fields off-chain. Persist only wallet address, attestation object ID, verification level, expiry, and revocation flag.
- Always show a human-readable consent message before requesting signatures.
- Serve the SDK over HTTPS and point to HTTPS RPC URLs.
- Consider rate limiting and retry logic when deploying at scale (see `docs/API.md` and `README` TODOs).

---

## 12. Putting it all together

1. **Install** `suirifysdk` and instantiate a client with your RPC / attestation type.
2. **Hook up consent** – register `setConsentHandler`, render a modal, and collect a wallet signature.
3. **Detect attestations** – call `getAttestationForOwner` + `isValid` whenever a wallet connects.
4. **Request claims** – call `getPublicClaims` with the exact fields you need once the user approves.
5. **Gate features** – wire the returned claims into your layout, buttons, and API calls (see DemoApp’s `InteractionPanel`).
6. **Refresh when needed** – expose a `refresh()` button to re-run the flow, especially if users re-verify on SUIrify Portal in another tab.

With these steps you can reproduce the full Verified Launchpad experience—or adapt the SDK to any product that needs consent-first, attestation-gated interactions on Sui.

For deeper API details, refer to `sdk/docs/API.md`, and use `sdk/src/examples/web-demo` as a living reference implementation.

---

## Appendix A: End-to-end flow example

1. **Wallet connects** → your verification provider calls `suirifyClient.setConsentHandler(...)` (already done during boot) and starts the attestation query.
2. **SDK requests lookup consent** → your modal appears, the user signs, and the handler resolves `true`.
3. **`getAttestationForOwner` completes** → store `attestationId` + `objectDigest` in context.
4. **Validity check** → call `isValid` and, if revoked/expired, surface remediation CTAs (“Re-verify on SUIrify Portal”).
5. **Claims request** → pass the curated field list; the SDK reuses the consent you captured earlier (or re-prompts if the scopes changed).
6. **UI gating** → components call `requireVerification()` before sensitive actions; if it returns `false`, forward the message from context (“Connect wallet”, “Share consent”, etc.).
7. **Server confirmation (optional)** → send `{ walletAddress, attestationId }` to your backend and re-run `getPublicClaims` to double-check status before fulfilling premium features.
8. **User refreshes** → clicking “Refresh verification” triggers `client.clearCache()` (optional) and re-executes the same steps, ensuring long-lived sessions remain accurate.

Following this script ensures every integration path—web, mobile, server-side—behaves the same way users already experience inside our Verified Launchpad app.
