# Suirify SDK

TypeScript SDK for reading **Suirify_Attestation** objects over the Sui RPC in a privacy-preserving, read-only fashion. The SDK powers:

- A minimal, reusable `SuirifySdk`

> ⚠️ **Security & Privacy**: Never persist personal data. Only store the wallet address, attestation `objectId`, verification level, issued/expiry timestamps, and revocation bit. Do **not** copy `name_hash` or PII fields off-chain. Always serve this SDK over HTTPS and talk to HTTPS RPC endpoints.

---

## Quick Start

```bash
# install dependencies
npm install

# build the SDK (dist/)
npm run build

# run unit tests
npm test

# spin up the React demo (after building the SDK once)
cd src/examples/web-demo
npm install
npm run dev

```

Create a `.env` file (root and demos can share it) using `.env.example`:

```
SUI_RPC_URL=https://fullnode.devnet.sui.io:443
SUI_NETWORK=devnet
```

## Installing as a dependency

This repository is ready to be published to npm. Until then, consume it locally via `file:` references (see the web demo). After publishing:

```ts
import { SuirifySdk } from "suirifysdk";

const client = new SuirifySdk({
  rpcUrl: process.env.SUI_RPC_URL,
});
const result = await client.getAttestationForOwner("0xALICE");
if (result.found && result.attestation) {
  const validity = await client.isValid(result.attestation);
  if (validity.valid) {
    // TODO: show consent modal to end-user, then read claims via client.getPublicClaims
  }
} else {
  // Redirect to SUIrify onboarding portal (placeholder link in README)
}
```

## SDK Highlights

- **Read-only flow.** Nothing is written on-chain, but every lookup/claim read is guarded by a wallet signature for user consent.
- **Attestation discovery.** Uses `getOwnedObjects` to find `Suirify_Attestation` structs.
- **Robust parsing.** `parseObject.ts` normalizes differing RPC payload shapes; extendable via comments.
- **Consent-aware claims.** `getPublicClaims()` requests user consent before exposing public fields.
- **Validity helper.** `isValid()` checks revocation, expiry, and status bits.
- **In-memory caching.** Avoids repeated RPC calls within a configurable window (`cacheMs`).

Full API docs live in [`docs/API.md`](docs/API.md).

## Consent Flow Integration

By default the SDK auto-consents (with a warning) to keep scripts runnable. In your UI, register a consent handler to show a modal / sheet:

```ts
const client = new SuirifySdk();
client.setConsentHandler(async (fields) => {
  const ok = await openYourModal(fields); // resolve true/false
  // fields can include the special "attestation_lookup" scope before any RPC queries happen
  return ok;
});

const claims = await client.getPublicClaims(walletAddress, [
  "is_human_verified",
  "is_over_18",
  "verification_level",
]);
```

See `src/examples/web-demo/src/App.tsx` for a practical implementation.

## Web Demo

The React demo illustrates the UX end-to-end:

1. User connects a Sui wallet (or pastes an address).
2. App uses `SuirifySdk` to discover the attestation object.
3. If none found, the user is redirected to https://devnet.suirify.com to get verified.
4. When found, the user hits **Request Public Claims**, triggering a consent modal + wallet signature.
5. Approved claims unlock simulated launchpad actions (join allowlist, view hidden details, etc.).

Run it locally:

```bash
npm run build
cd src/examples/web-demo
npm install
npm run dev
```

Then open http://localhost:5175.

## Node Demo

A light CLI script fetches and prints a wallet's attestation:

```bash
SUI_RPC_URL=https://fullnode.devnet.sui.io:443 \
  npx ts-node src/examples/node-demo/demo.ts 0xYourSuiAddress
```

## Tests

Vitest covers:

- `findAttestationObjects` filtering logic
- Field parsing in `getAttestationByObjectId`
- `isValid` revocation / expiry guards

Run them with `npm test`.

## Extending / Production TODOs

- [ ] Replace mock consent in non-UI contexts with real UX surfaces.
- [ ] Use a backend callback to map wallet → attestation metadata if storing server-side state.
- [ ] Harden `parseObject.ts` once the on-chain struct stabilizes; document any provider-specific quirks near the helper comments.
- [ ] Rate-limit RPC calls and add retries/backoff.
- [ ] Never cache PII server-side. Store only: wallet address, attestation object ID, verification level, issue/expiry timestamps, and revocation flag.

## RPC & Network Notes

- Default RPC: `https://fullnode.devnet.sui.io:443`
- Always use an HTTPS RPC endpoint.
- Set `SUI_NETWORK` in `.env` for logging/documentation purposes (not currently enforced in code).

---

Built for the Suirify protocol to demonstrate a consent-first, read-only attestation flow. Contributions welcome—open a PR once you've run `npm run build && npm test`.
