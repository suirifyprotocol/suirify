/**
 * Main entry point for reading SUIrify attestations via Sui RPC.
 */

import { createSuiProvider } from "./suiProvider.js";
import type {
  AttestationField,
  AttestationOnChain,
  AttestationResult,
  ConsentScope,
  SuirifySdkOptions,
  SuiProviderInstance
} from "./types.js";
import { normalizeRpcObject, parseAttestationObject } from "../utils/parseObject.js";
import { msUntil, nowMs } from "../utils/time.js";

const getEnv = (key: string): string | undefined =>
  typeof process !== "undefined" ? process.env?.[key] : undefined;

const ENV_PACKAGE_ID = getEnv("SUIRIFY_PACKAGE_ID") || getEnv("PACKAGE_ID");
const FALLBACK_PACKAGE_ID = "0x213371dcba7963562d0350d7fcf05e5f33da501a1d6ad316f9cd2b87a958897f";
const DEFAULT_PACKAGE_ID = ENV_PACKAGE_ID || FALLBACK_PACKAGE_ID;

const ENV_ATTESTATION_TYPE =
  getEnv("SUIRIFY_ATTESTATION_TYPE") || getEnv("ATTESTATION_TYPE");

export const ATTESTATION_TYPE =
  ENV_ATTESTATION_TYPE || `${DEFAULT_PACKAGE_ID}::protocol::Suirify_Attestation`;

const DEFAULT_CACHE_MS = 5000;
const PUBLIC_FIELDS: AttestationField[] = [
  "is_human_verified",
  "is_over_18",
  "verification_level",
  "expiry_time_ms",
  "revoked"
];

type CacheEntry = { timestamp: number; result: AttestationResult };

type ConsentHandler = (fields: ConsentScope[]) => Promise<boolean>;

export class SuirifySdk {
  private readonly provider: SuiProviderInstance;
  private readonly cacheMs: number;
  private readonly attestationType: string;
  private readonly cache = new Map<string, CacheEntry>();
  private consentHandler: ConsentHandler | null = null;

  constructor(opts: SuirifySdkOptions = {}) {
    this.provider = opts.provider || createSuiProvider(opts.rpcUrl);
    this.cacheMs = opts.cacheMs ?? DEFAULT_CACHE_MS;
    this.attestationType = opts.attestationType || ATTESTATION_TYPE;
  }

  /** Override the consent handler (default always resolves true). */
  setConsentHandler(handler: ConsentHandler) {
    this.consentHandler = handler;
  }

  /**
   * Finds all object IDs owned by `ownerAddress` whose type exactly matches ATTESTATION_TYPE.
   */
  async findAttestationObjects(ownerAddress: string): Promise<string[]> {
    const owned = await this.provider.getOwnedObjects(ownerAddress);
    const attestationObjectIds: string[] = [];

    for (const object of owned) {
      const normalized = normalizeRpcObject(object);
      if (normalized.type === this.attestationType && normalized.objectId) {
        attestationObjectIds.push(normalized.objectId);
      }
    }

    return attestationObjectIds;
  }

  /** Fetches and parses an attestation object by ID. */
  async getAttestationByObjectId(objectId: string): Promise<AttestationOnChain | null> {
    const raw = await this.provider.getObject(objectId);
    if (!raw) return null;
    return parseAttestationObject(raw);
  }

  /**
   * Returns the primary attestation for `ownerAddress`, or found=false if none exist.
   */
  async getAttestationForOwner(ownerAddress: string): Promise<AttestationResult> {
    const cached = this.cache.get(ownerAddress);
    if (cached && nowMs() - cached.timestamp < this.cacheMs) {
      return cached.result;
    }

    await this.ensureConsent(["attestation_lookup"], "User denied attestation lookup request");

    try {
      const objectIds = await this.findAttestationObjects(ownerAddress);
      if (objectIds.length === 0) {
        const res: AttestationResult = { found: false };
        this.cache.set(ownerAddress, { timestamp: nowMs(), result: res });
        return res;
      }

      const attestation = await this.getAttestationByObjectId(objectIds[0]);
      if (!attestation) {
        const res: AttestationResult = {
          found: false,
          error: "Unable to parse attestation object"
        };
        this.cache.set(ownerAddress, { timestamp: nowMs(), result: res });
        return res;
      }

      const res: AttestationResult = {
        found: true,
        attestation,
        objectId: attestation.objectId
      };
      this.cache.set(ownerAddress, { timestamp: nowMs(), result: res });
      return res;
    } catch (error) {
      console.error("Failed to read attestation", error);
      const res: AttestationResult = {
        found: false,
        error: error instanceof Error ? error.message : String(error)
      };
      this.cache.set(ownerAddress, { timestamp: nowMs(), result: res });
      return res;
    }
  }

  /**
   * Checks revocation and expiry fields for validity.
   */
  async isValid(att: AttestationOnChain): Promise<{ valid: boolean; reason?: string }> {
    if (att.revoked) {
      return { valid: false, reason: "Attestation revoked" };
    }

    if (att.expiry_time_ms !== undefined) {
      const delta = msUntil(att.expiry_time_ms);
      if (delta !== undefined && delta <= 0) {
        return { valid: false, reason: "Attestation expired" };
      }
    }

    if (att.status !== undefined && att.status !== 1) {
      return {
        valid: false,
        reason: "Attestation is not in an active status (status !== 1)"
      };
    }

    return { valid: true };
  }

  /** Default consent helper. Override via setConsentHandler for UI integrations. */
  async presentConsentModal(fieldsToRequest: ConsentScope[]): Promise<boolean> {
    if (this.consentHandler) {
      return this.consentHandler(fieldsToRequest);
    }

    // eslint-disable-next-line no-console
    console.warn(
      "presentConsentModal was called without a handler; auto-consenting for demo purposes",
      fieldsToRequest
    );
    return true;
  }

  private async ensureConsent(scopes: ConsentScope[], denialMessage: string) {
    const consented = await this.presentConsentModal(scopes);
    if (!consented) {
      throw new Error(denialMessage);
    }
  }

  /**
   * Convenience helper that ensures consent is granted before returning whitelisted claims.
   */
  async getPublicClaims(
    ownerAddress: string,
    fields: AttestationField[] = ["is_human_verified", "is_over_18"]
  ): Promise<Partial<Pick<AttestationOnChain, AttestationField>>> {
    const sanitizedFields = fields.filter((field) => PUBLIC_FIELDS.includes(field));

    if (sanitizedFields.length === 0) {
      throw new Error("No readable public fields were requested");
    }

    await this.ensureConsent(sanitizedFields, "User did not consent to read attestation fields");

    const res = await this.getAttestationForOwner(ownerAddress);
    if (!res.found || !res.attestation) {
      throw new Error("No attestation found for owner");
    }

    const claims: Partial<Pick<AttestationOnChain, AttestationField>> = {};
    sanitizedFields.forEach((field) => {
      claims[field] = res.attestation?.[field] as any;
    });
    return claims;
  }
}
