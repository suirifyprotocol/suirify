# SDK API Reference

## Constants

### `ATTESTATION_TYPE`

`0xfaad95533f8c546fbf0d35c5a0816b5d2a86cd8a3d27d5af1a25c63bb652cb7d::protocol::Suirify_Attestation`

Use this if you need to filter objects manually outside of the client helpers.

> Set `SUIRIFY_ATTESTATION_TYPE` / `ATTESTATION_TYPE` (or `SUIRIFY_PACKAGE_ID` / `PACKAGE_ID`) before importing the SDK to override this default.

---

## Interfaces

### `SuirifySdkOptions`

- `rpcUrl?: string` – override the RPC endpoint (defaults to `process.env.SUI_RPC`, `SUI_RPC_URL`, etc., or devnet).
- `provider?: SuiProviderInstance` – inject your own `@mysten/sui.js` provider.
- `cacheMs?: number` – cache duration for `getAttestationForOwner` (default 5000 ms).
- `attestationType?: string` – override the struct type filter (defaults to `ATTESTATION_TYPE`).

### `AttestationOnChain`

Typed representation of the struct's fields. Numbers are coerced into `number`, booleans into `boolean`.

### `ConsentScope`

Union of the readable attestation fields plus the special scope `"attestation_lookup"`, which is requested before the SDK searches for attestation objects. Your `setConsentHandler` callback should handle both cases.

### `AttestationResult`

```
{
  found: boolean;
  attestation?: AttestationOnChain;
  objectId?: string;
  error?: string;
}
```

---

## `class SuirifySdk`

### Constructor

```ts
const client = new SuirifySdk({
  rpcUrl: string,
  provider: SuiProviderInstance,
  cacheMs: number,
});
```

### Methods

#### `setConsentHandler(handler: (fields: ConsentScope[]) => Promise<boolean>): void`

Registers a UI-specific consent callback. The helper `getPublicClaims` uses this to block until the user approves/denies the requested fields, and `getAttestationForOwner` now requests the special `"attestation_lookup"` scope before it touches the RPC.

#### `findAttestationObjects(ownerAddress: string): Promise<string[]>`

Returns the object IDs of all owned `Suirify_Attestation` structs. Under the hood it calls `provider.getOwnedObjects` and filters by the configured `attestationType` (or the default `ATTESTATION_TYPE`).

#### `getAttestationByObjectId(objectId: string): Promise<AttestationOnChain | null>`

Fetches a specific object via `provider.getObject()` and parses the fields using `parseObject.ts`. Returns `null` if parsing fails.

#### `getAttestationForOwner(ownerAddress: string): Promise<AttestationResult>`

Convenience wrapper that finds the first matching attestation for a wallet, caches the result for `cacheMs`, and returns `{ found, attestation, objectId }`. It requests `"attestation_lookup"` consent (via `setConsentHandler`) before issuing RPC calls unless a cached value is still fresh.

#### `isValid(att: AttestationOnChain): Promise<{ valid: boolean; reason?: string }>`

Checks:

1. `revoked === true` ⇒ invalid.
2. `expiry_time_ms` exists and is older than `Date.now()` ⇒ invalid.
3. `status` exists and is not `1` ⇒ invalid (align this with your on-chain enum).

#### `presentConsentModal(fields: ConsentScope[]): Promise<boolean>`

Built-in helper invoked by both `getPublicClaims` (twice) and the lookup flow. Override with `setConsentHandler()` to show your own modal/wallet signature UX. The helper is still public so you can reuse it in custom code paths.

#### `getPublicClaims(ownerAddress: string, fields?: AttestationField[]): Promise<Partial<AttestationOnChain>>`

After a successful consent request, resolves with a subset of fields. Only the whitelisted fields
(`is_human_verified`, `is_over_18`, `verification_level`, `expiry_time_ms`, `revoked`) are allowed. Throws if no attestation is present or the user denies consent.

---

## Utilities

### `createSuiProvider(rpcUrl?: string): SuiProviderInstance`

Returns a thin wrapper around `JsonRpcProvider` with normalized `getOwnedObjects`/`getObject` signatures used by the client.

### `normalizeRpcObject(raw)` / `parseAttestationObject(raw)` (internal)

Located in `src/utils/parseObject.ts`. They attempt to accommodate multiple RPC payload shapes. If your RPC node returns yet another structure, add a small branch near the top with a comment (e.g. "// Mysten RPC vX payload").

### `nowMs()` / `msUntil()`

Simple time helpers inside `src/utils/time.ts`.

---

## Extending the SDK

- Swap out the provider if you already manage your own `JsonRpcProvider` instance.
- Wrap `getPublicClaims` to add auditing/logging on the server (without storing sensitive data).
- Provide a stricter `isValid` implementation once the on-chain enum for `status` is finalized.
- TODO: add backend callback handlers for real SUIrify OAuth-style flows. Placeholder functions live in `README.md` for guidance.
