import { describe, expect, it, vi, beforeEach } from "vitest";
import { SuirifySdk, ATTESTATION_TYPE } from "../src/client/attestationSdk.js";
import type { RawSuiObjectRpcResponse, SuiProviderInstance } from "../src/client/types.js";

const sampleFields = {
  jurisdiction_code: "234",
  verification_level: "2",
  expiry_time_ms: `${Date.now() + 60_000}`,
  revoked: false,
  is_human_verified: true,
  is_over_18: true
};

describe("SuirifySdk", () => {
  let provider: SuiProviderInstance;
  let client: SuirifySdk;

  beforeEach(() => {
    provider = {
      getOwnedObjects: vi.fn(),
      getObject: vi.fn()
    };
    client = new SuirifySdk({ provider, cacheMs: 0 });
  });

  it("findAttestationObjects filters by struct type", async () => {
    const owned: RawSuiObjectRpcResponse[] = [
      { data: { type: ATTESTATION_TYPE, objectId: "0x1" } },
      { data: { type: "other::Struct", objectId: "0x2" } }
    ];
    (provider.getOwnedObjects as any).mockResolvedValue(owned);

    const ids = await client.findAttestationObjects("0xabc");
    expect(ids).toEqual(["0x1"]);
  });

  it("supports overriding the attestation struct type", async () => {
    const customType = "0xdead::protocol::Suirify_Attestation";
    client = new SuirifySdk({ provider, attestationType: customType, cacheMs: 0 });

    const owned: RawSuiObjectRpcResponse[] = [
      { data: { type: customType, objectId: "0x99" } },
      { data: { type: ATTESTATION_TYPE, objectId: "0x1" } }
    ];
    (provider.getOwnedObjects as any).mockResolvedValue(owned);

    const ids = await client.findAttestationObjects("0xabc");
    expect(ids).toEqual(["0x99"]);
  });

  it("parses attestation fields from RPC payload", async () => {
    const raw: RawSuiObjectRpcResponse = {
      data: {
        objectId: "0xa",
        owner: { AddressOwner: "0xabc" },
        content: {
          type: ATTESTATION_TYPE,
          fields: sampleFields
        }
      }
    };
    (provider.getObject as any).mockResolvedValue(raw);

    const attestation = await client.getAttestationByObjectId("0xa");
    expect(attestation?.objectId).toBe("0xa");
    expect(attestation?.verification_level).toBe(2);
    expect(attestation?.is_human_verified).toBe(true);
  });

  it("isValid fails when revoked or expired", async () => {
    const base = {
      objectId: "0x1",
      owner: "0xabc"
    };

    const revokedCheck = await client.isValid({ ...base, revoked: true });
    expect(revokedCheck.valid).toBe(false);

    const expiredCheck = await client.isValid({
      ...base,
      revoked: false,
      expiry_time_ms: Date.now() - 1
    });
    expect(expiredCheck.valid).toBe(false);
  });

  it("requests consent before fetching attestation data", async () => {
    const handler = vi.fn().mockResolvedValue(true);
    client.setConsentHandler(handler);
    (provider.getOwnedObjects as any).mockResolvedValue([]);

    await client.getAttestationForOwner("0xabc");

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(["attestation_lookup"]);
  });

  it("throws when lookup consent is denied", async () => {
    const handler = vi.fn().mockResolvedValue(false);
    client.setConsentHandler(handler);

    await expect(client.getAttestationForOwner("0xabc")).rejects.toThrow(
      "User denied attestation lookup request"
    );
    expect(provider.getOwnedObjects).not.toHaveBeenCalled();
  });
});
