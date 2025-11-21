/**
 * Main entry point for reading SUIrify attestations via Sui RPC.
 */
import type { AttestationField, AttestationOnChain, AttestationResult, ConsentScope, SuirifySdkOptions } from "./types.js";
export declare const ATTESTATION_TYPE: string;
type ConsentHandler = (fields: ConsentScope[]) => Promise<boolean>;
export declare class SuirifySdk {
    private readonly provider;
    private readonly cacheMs;
    private readonly attestationType;
    private readonly cache;
    private consentHandler;
    constructor(opts?: SuirifySdkOptions);
    /** Override the consent handler (default always resolves true). */
    setConsentHandler(handler: ConsentHandler): void;
    /**
     * Finds all object IDs owned by `ownerAddress` whose type exactly matches ATTESTATION_TYPE.
     */
    findAttestationObjects(ownerAddress: string): Promise<string[]>;
    /** Fetches and parses an attestation object by ID. */
    getAttestationByObjectId(objectId: string): Promise<AttestationOnChain | null>;
    /**
     * Returns the primary attestation for `ownerAddress`, or found=false if none exist.
     */
    getAttestationForOwner(ownerAddress: string): Promise<AttestationResult>;
    /**
     * Checks revocation and expiry fields for validity.
     */
    isValid(att: AttestationOnChain): Promise<{
        valid: boolean;
        reason?: string;
    }>;
    /** Default consent helper. Override via setConsentHandler for UI integrations. */
    presentConsentModal(fieldsToRequest: ConsentScope[]): Promise<boolean>;
    private ensureConsent;
    /**
     * Convenience helper that ensures consent is granted before returning whitelisted claims.
     */
    getPublicClaims(ownerAddress: string, fields?: AttestationField[]): Promise<Partial<Pick<AttestationOnChain, AttestationField>>>;
}
export {};
