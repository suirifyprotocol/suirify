/**
 * Helper utilities for coercing Sui RPC payloads into typed objects.
 */

import type { AttestationOnChain, RawSuiObjectRpcResponse } from "../client/types.js";

interface ParsedObject {
  type?: string;
  owner?: string;
  objectId?: string;
  version?: number;
  fields?: Record<string, any> | null;
}

/**
 * Attempts to normalize different RPC response shapes into a predictable structure.
 * If you notice that your RPC node returns data in a different layout, adapt the
 * accessors below and add another branch with a comment describing the payload.
 */
export function normalizeRpcObject(raw: RawSuiObjectRpcResponse): ParsedObject {
  if (!raw) return {};

  const candidateData = raw.data || raw.details || raw;
  const content = candidateData?.content || candidateData?.data?.content;
  const fields = content?.fields || candidateData?.fields || candidateData?.data?.fields || null;

  const owner =
    candidateData?.owner?.AddressOwner ||
    candidateData?.owner?.ObjectOwner ||
    candidateData?.owner?.Shared ||
    candidateData?.owner ||
    raw?.owner;

  const type =
    candidateData?.type ||
    content?.type ||
    candidateData?.data?.type ||
    raw?.type;

  const objectId =
    candidateData?.objectId ||
    candidateData?.reference?.objectId ||
    candidateData?.data?.objectId ||
    candidateData?.id ||
    raw?.objectId;

  const versionRaw =
    candidateData?.version ||
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

const coerceNumber = (value: unknown): number | undefined => {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.length > 0 && !Number.isNaN(Number(value))) {
    return Number(value);
  }
  return undefined;
};

const coerceBoolean = (value: unknown): boolean | undefined => {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") return value === "true" || value === "1";
  return undefined;
};

export function parseAttestationObject(
  raw: RawSuiObjectRpcResponse
): AttestationOnChain | null {
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
