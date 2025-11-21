declare module "suirifysdk" {
  export type AttestationField =
    | "is_human_verified"
    | "is_over_18"
    | "verification_level"
    | "expiry_time_ms"
    | "revoked";

  export interface AttestationOnChain {
    objectId: string;
    verification_level?: number;
    expiry_time_ms?: number;
    revoked?: boolean;
    [key: string]: unknown;
  }

  export interface AttestationResult {
    found: boolean;
    objectId?: string;
    attestation?: AttestationOnChain;
    error?: string;
  }

  export type ConsentScope = AttestationField | "attestation_lookup";

  export class SuirifySdk {
    constructor(opts?: { rpcUrl?: string; cacheMs?: number; attestationType?: string });
    setConsentHandler(handler: (fields: ConsentScope[]) => Promise<boolean>): void;
    getAttestationForOwner(owner: string): Promise<AttestationResult>;
    isValid(attestation: AttestationOnChain): Promise<{ valid: boolean; reason?: string }>;
    getPublicClaims<T extends AttestationField>(
      owner: string,
      fields: T[]
    ): Promise<Partial<Record<T, unknown>>>;
  }
}
