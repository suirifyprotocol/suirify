/**
 * Shared TypeScript types for the SUIrify attestation SDK.
 */

export interface RawSuiObjectRpcResponse {
  data?: any;
  details?: any;
  error?: string | null;
  [key: string]: unknown;
}

export interface AttestationOnChain {
  objectId: string;
  owner: string;
  jurisdiction_code?: number;
  verification_level?: number;
  verifier_source?: number;
  verifier_version?: number;
  issue_time_ms?: number;
  expiry_time_ms?: number;
  status?: number;
  revoked?: boolean;
  revoke_time_ms?: number;
  revoke_reason_code?: number;
  name_hash?: Uint8Array | number[] | null;
  is_human_verified?: boolean;
  is_over_18?: boolean;
  version?: number;
}

export interface AttestationResult {
  found: boolean;
  attestation?: AttestationOnChain;
  objectId?: string;
  error?: string;
}

export interface SuiProviderInstance {
  getOwnedObjects(owner: string): Promise<RawSuiObjectRpcResponse[]>;
  getObject(objectId: string): Promise<RawSuiObjectRpcResponse | null>;
}

export interface SuirifySdkOptions {
  rpcUrl?: string;
  provider?: SuiProviderInstance;
  cacheMs?: number;
  attestationType?: string;
}

export type AttestationField = keyof Pick<
  AttestationOnChain,
  | "is_human_verified"
  | "is_over_18"
  | "verification_level"
  | "expiry_time_ms"
  | "revoked"
>;

/**
 * Consent scopes that the SDK may request from the host app.
 * `attestation_lookup` is used before searching for attestation objects.
 */
export type ConsentScope = AttestationField | "attestation_lookup";
