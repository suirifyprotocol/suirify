export const PACKAGE_ID = import.meta.env.VITE_SUIRIFY_PACKAGE_ID || "0x213371dcba7963562d0350d7fcf05e5f33da501a1d6ad316f9cd2b87a958897f";

export const STRUCT_ATTESTATION = `${PACKAGE_ID}::protocol::Suirify_Attestation`;

export const DEFAULT_EXPLORER_BASE = "https://suiscan.xyz/devnet"; // Sui explorer

export const explorer = {
  tx: (digest: string) => `${DEFAULT_EXPLORER_BASE}/tx/${digest}`,
  object: (id: string) => `${DEFAULT_EXPLORER_BASE}/object/${id}`,
};

export type AttestationStatus = "ACTIVE" | "EXPIRED" | "REVOKED" | "PENDING_BURN";
