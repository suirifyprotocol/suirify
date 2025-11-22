'use strict';

var client = require('@mysten/sui.js/client');

/**
 * Thin wrapper around the official @mysten/sui.js JsonRpcProvider.
 */
const resolveDefaultRpc = () => {
    if (typeof process === "undefined")
        return undefined;
    return (process.env?.SUI_RPC ||
        process.env?.SUI_RPC_URL ||
        process.env?.SUI_FULLNODE_URL ||
        process.env?.SUI_PROVIDER_URL);
};
const DEFAULT_RPC_URL = resolveDefaultRpc() || "https://fullnode.devnet.sui.io:443";
class DefaultSuiProvider {
    constructor(rpcUrl = DEFAULT_RPC_URL) {
        this.client = new client.SuiClient({ url: rpcUrl });
    }
    /**
     * Fetches all objects owned by a given address, returning the raw RPC payloads.
     * Options request enough metadata for downstream parsing.
     */
    async getOwnedObjects(owner) {
        const result = await this.client.getOwnedObjects({
            owner,
            options: {
                showContent: true,
                showOwner: true,
                showType: true
            }
        });
        return (result?.data ?? []);
    }
    /**
     * Fetches a specific object by its ID.
     */
    async getObject(objectId) {
        try {
            const result = await this.client.getObject({
                id: objectId,
                options: {
                    showContent: true,
                    showOwner: true,
                    showType: true
                }
            });
            return result;
        }
        catch (error) {
            console.error("Failed to fetch object", objectId, error);
            return null;
        }
    }
}
const createSuiProvider = (rpcUrl) => new DefaultSuiProvider(rpcUrl);

/**
 * Helper utilities for coercing Sui RPC payloads into typed objects.
 */
/**
 * Attempts to normalize different RPC response shapes into a predictable structure.
 * If you notice that your RPC node returns data in a different layout, adapt the
 * accessors below and add another branch with a comment describing the payload.
 */
function normalizeRpcObject(raw) {
    if (!raw)
        return {};
    const candidateData = raw.data || raw.details || raw;
    const content = candidateData?.content || candidateData?.data?.content;
    const fields = content?.fields || candidateData?.fields || candidateData?.data?.fields || null;
    const owner = candidateData?.owner?.AddressOwner ||
        candidateData?.owner?.ObjectOwner ||
        candidateData?.owner?.Shared ||
        candidateData?.owner ||
        raw?.owner;
    const type = candidateData?.type ||
        content?.type ||
        candidateData?.data?.type ||
        raw?.type;
    const objectId = candidateData?.objectId ||
        candidateData?.reference?.objectId ||
        candidateData?.data?.objectId ||
        candidateData?.id ||
        raw?.objectId;
    const versionRaw = candidateData?.version ||
        candidateData?.reference?.version ||
        candidateData?.data?.version;
    return {
        type,
        owner,
        objectId,
        version: typeof versionRaw === "string" ? Number(versionRaw) : versionRaw,
        fields
    };
}
const coerceNumber = (value) => {
    if (value === undefined || value === null)
        return undefined;
    if (typeof value === "number")
        return value;
    if (typeof value === "string" && value.length > 0 && !Number.isNaN(Number(value))) {
        return Number(value);
    }
    return undefined;
};
const coerceBoolean = (value) => {
    if (value === undefined || value === null)
        return undefined;
    if (typeof value === "boolean")
        return value;
    if (typeof value === "number")
        return value !== 0;
    if (typeof value === "string")
        return value === "true" || value === "1";
    return undefined;
};
function parseAttestationObject(raw) {
    const normalized = normalizeRpcObject(raw);
    if (!normalized.fields) {
        return null;
    }
    const f = normalized.fields;
    return {
        objectId: normalized.objectId || "",
        owner: normalized.owner || "",
        jurisdiction_code: coerceNumber(f.jurisdiction_code),
        verification_level: coerceNumber(f.verification_level),
        verifier_source: coerceNumber(f.verifier_source),
        verifier_version: coerceNumber(f.verifier_version),
        issue_time_ms: coerceNumber(f.issue_time_ms),
        expiry_time_ms: coerceNumber(f.expiry_time_ms),
        status: coerceNumber(f.status),
        revoked: coerceBoolean(f.revoked) ?? false,
        revoke_time_ms: coerceNumber(f.revoke_time_ms),
        revoke_reason_code: coerceNumber(f.revoke_reason_code),
        name_hash: f.name_hash ?? null,
        is_human_verified: coerceBoolean(f.is_human_verified),
        is_over_18: coerceBoolean(f.is_over_18),
        version: normalized.version
    };
}

/** Time helpers for consistent millisecond calculations. */
const nowMs = () => Date.now();
const msUntil = (futureMs) => {
    if (futureMs === undefined)
        return undefined;
    return futureMs - nowMs();
};

/**
 * Main entry point for reading SUIrify attestations via Sui RPC.
 */
const getEnv = (key) => typeof process !== "undefined" ? process.env?.[key] : undefined;
const ENV_PACKAGE_ID = getEnv("SUIRIFY_PACKAGE_ID") || getEnv("PACKAGE_ID");
const FALLBACK_PACKAGE_ID = "0x213371dcba7963562d0350d7fcf05e5f33da501a1d6ad316f9cd2b87a958897f";
const DEFAULT_PACKAGE_ID = ENV_PACKAGE_ID || FALLBACK_PACKAGE_ID;
const ENV_ATTESTATION_TYPE = getEnv("SUIRIFY_ATTESTATION_TYPE") || getEnv("ATTESTATION_TYPE");
const ATTESTATION_TYPE = ENV_ATTESTATION_TYPE || `${DEFAULT_PACKAGE_ID}::protocol::Suirify_Attestation`;
const DEFAULT_CACHE_MS = 5000;
const PUBLIC_FIELDS = [
    "is_human_verified",
    "is_over_18",
    "verification_level",
    "expiry_time_ms",
    "revoked"
];
class SuirifySdk {
    constructor(opts = {}) {
        this.cache = new Map();
        this.consentHandler = null;
        this.provider = opts.provider || createSuiProvider(opts.rpcUrl);
        this.cacheMs = opts.cacheMs ?? DEFAULT_CACHE_MS;
        this.attestationType = opts.attestationType || ATTESTATION_TYPE;
    }
    /** Override the consent handler (default always resolves true). */
    setConsentHandler(handler) {
        this.consentHandler = handler;
    }
    /**
     * Finds all object IDs owned by `ownerAddress` whose type exactly matches ATTESTATION_TYPE.
     */
    async findAttestationObjects(ownerAddress) {
        const owned = await this.provider.getOwnedObjects(ownerAddress);
        const attestationObjectIds = [];
        for (const object of owned) {
            const normalized = normalizeRpcObject(object);
            if (normalized.type === this.attestationType && normalized.objectId) {
                attestationObjectIds.push(normalized.objectId);
            }
        }
        return attestationObjectIds;
    }
    /** Fetches and parses an attestation object by ID. */
    async getAttestationByObjectId(objectId) {
        const raw = await this.provider.getObject(objectId);
        if (!raw)
            return null;
        return parseAttestationObject(raw);
    }
    /**
     * Returns the primary attestation for `ownerAddress`, or found=false if none exist.
     */
    async getAttestationForOwner(ownerAddress) {
        const cached = this.cache.get(ownerAddress);
        if (cached && nowMs() - cached.timestamp < this.cacheMs) {
            return cached.result;
        }
        await this.ensureConsent(["attestation_lookup"], "User denied attestation lookup request");
        try {
            const objectIds = await this.findAttestationObjects(ownerAddress);
            if (objectIds.length === 0) {
                const res = { found: false };
                this.cache.set(ownerAddress, { timestamp: nowMs(), result: res });
                return res;
            }
            const attestation = await this.getAttestationByObjectId(objectIds[0]);
            if (!attestation) {
                const res = {
                    found: false,
                    error: "Unable to parse attestation object"
                };
                this.cache.set(ownerAddress, { timestamp: nowMs(), result: res });
                return res;
            }
            const res = {
                found: true,
                attestation,
                objectId: attestation.objectId
            };
            this.cache.set(ownerAddress, { timestamp: nowMs(), result: res });
            return res;
        }
        catch (error) {
            console.error("Failed to read attestation", error);
            const res = {
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
    async isValid(att) {
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
    async presentConsentModal(fieldsToRequest) {
        if (this.consentHandler) {
            return this.consentHandler(fieldsToRequest);
        }
        // eslint-disable-next-line no-console
        console.warn("presentConsentModal was called without a handler; auto-consenting for demo purposes", fieldsToRequest);
        return true;
    }
    async ensureConsent(scopes, denialMessage) {
        const consented = await this.presentConsentModal(scopes);
        if (!consented) {
            throw new Error(denialMessage);
        }
    }
    /**
     * Convenience helper that ensures consent is granted before returning whitelisted claims.
     */
    async getPublicClaims(ownerAddress, fields = ["is_human_verified", "is_over_18"]) {
        const sanitizedFields = fields.filter((field) => PUBLIC_FIELDS.includes(field));
        if (sanitizedFields.length === 0) {
            throw new Error("No readable public fields were requested");
        }
        await this.ensureConsent(sanitizedFields, "User did not consent to read attestation fields");
        const res = await this.getAttestationForOwner(ownerAddress);
        if (!res.found || !res.attestation) {
            throw new Error("No attestation found for owner");
        }
        const claims = {};
        sanitizedFields.forEach((field) => {
            claims[field] = res.attestation?.[field];
        });
        return claims;
    }
}

exports.ATTESTATION_TYPE = ATTESTATION_TYPE;
exports.SuirifySdk = SuirifySdk;
exports.createSuiProvider = createSuiProvider;
