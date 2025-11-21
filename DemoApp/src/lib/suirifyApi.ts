import type { AttestationSummary, ClaimField } from "@/types";
import { suirifyClient } from "@/lib/suirifyClient";

const FORCE_MOCK = import.meta.env.VITE_SUIRIFY_FORCE_MOCK === "true";
const ENABLE_MOCK_FALLBACK = import.meta.env.VITE_SUIRIFY_ENABLE_MOCK_FALLBACK !== "false";

type MockAttestation = {
  summary: AttestationSummary;
  claims: Record<ClaimField, unknown>;
};

const staticMockDb: Record<string, MockAttestation> = {
  "0xverifiedlaunchpad": {
    summary: {
      status: "verified",
      objectId: "0xmocklaunchpad",
      level: 3,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 180).toISOString()
    },
    claims: {
      is_human_verified: true,
      is_over_18: true,
      verification_level: 3,
      expiry_time_ms: Date.now() + 1000 * 60 * 60 * 24 * 180
    }
  },
  "0xpartneralpha": {
    summary: {
      status: "verified",
      objectId: "0xmockpartner",
      level: 2,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 90).toISOString()
    },
    claims: {
      is_human_verified: true,
      is_over_18: true,
      verification_level: 2,
      expiry_time_ms: Date.now() + 1000 * 60 * 60 * 24 * 90
    }
  }
};

const dynamicMockCache = new Map<string, MockAttestation>();

function buildDynamicMock(address: string): MockAttestation {
  return {
    summary: {
      status: "verified",
      objectId: `0xmock-${address.slice(-6)}`,
      level: 1,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 60).toISOString()
    },
    claims: {
      is_human_verified: true,
      is_over_18: true,
      verification_level: 1,
      expiry_time_ms: Date.now() + 1000 * 60 * 60 * 24 * 60
    }
  };
}

function getMockRecord(address: string): MockAttestation | null {
  const key = address.toLowerCase();
  if (staticMockDb[key]) return staticMockDb[key];
  if (key.endsWith("777")) {
    if (!dynamicMockCache.has(key)) {
      dynamicMockCache.set(key, buildDynamicMock(key));
    }
    return dynamicMockCache.get(key)!;
  }
  return null;
}

export async function fetchAttestationStatus(address: string): Promise<AttestationSummary> {
  if (FORCE_MOCK) {
    return fetchAttestationStatusMock(address);
  }

  try {
    const result = await suirifyClient.getAttestationForOwner(address);
    if (!result.found || !result.attestation) {
      return ENABLE_MOCK_FALLBACK ? fetchAttestationStatusMock(address) : { status: "unverified" };
    }

    const validity = await suirifyClient.isValid(result.attestation);
    if (!validity.valid) {
      return ENABLE_MOCK_FALLBACK ? fetchAttestationStatusMock(address) : { status: "unverified" };
    }

    return {
      status: "verified",
      objectId: result.objectId,
      level: result.attestation.verification_level ?? undefined,
      expiresAt: result.attestation.expiry_time_ms
        ? new Date(result.attestation.expiry_time_ms).toISOString()
        : undefined
    };
  } catch (error) {
    console.warn("Failed to fetch attestation via SDK", error);
    if (ENABLE_MOCK_FALLBACK) {
      return fetchAttestationStatusMock(address);
    }
    throw error instanceof Error ? error : new Error(String(error));
  }
}

export async function requestClaims(address: string, fields: ClaimField[]) {
  if (FORCE_MOCK) {
    return requestClaimsMock(address, fields);
  }

  try {
    const claims = await suirifyClient.getPublicClaims(address, fields as any);
    const response: Record<string, unknown> = {};
    fields.forEach((field) => {
      response[field] = claims[field as keyof typeof claims];
    });
    return response;
  } catch (error) {
    console.warn("Falling back to mock claims", error);
    if (ENABLE_MOCK_FALLBACK) {
      return requestClaimsMock(address, fields);
    }
    throw error instanceof Error ? error : new Error(String(error));
  }
}

export const attachConsentHandler = (handler: (fields: string[]) => Promise<boolean>) => {
  suirifyClient.setConsentHandler(handler);
};

function fetchAttestationStatusMock(address: string): AttestationSummary {
  return getMockRecord(address)?.summary ?? { status: "unverified" };
}

function requestClaimsMock(address: string, fields: ClaimField[]) {
  const entry = getMockRecord(address);
  if (!entry) {
    throw new Error("No attestation found for owner");
  }
  const claims: Record<string, unknown> = {};
  fields.forEach((field) => {
    claims[field] = entry.claims[field];
  });
  return claims;
}

export async function joinAllowlist(projectId: string) {
  await mockDelay();
  return { success: true, projectId };
}

export async function submitVote(projectId: string, vote: "support" | "pass") {
  await mockDelay();
  return { success: true, projectId, vote };
}

export async function submitComment(projectId: string, comment: string) {
  await mockDelay();
  return { success: true, projectId, comment, id: crypto.randomUUID() };
}

export async function claimTokens(projectId: string) {
  await mockDelay();
  return { success: true, projectId, txHash: `0x${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}` };
}

async function mockDelay(ms = 900) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
