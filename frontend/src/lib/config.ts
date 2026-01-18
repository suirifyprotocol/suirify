export const PACKAGE_ID = import.meta.env.VITE_SUIRIFY_PACKAGE_ID || "0xecd5a7ed68fce7a16251eecb72e75df9f8b26fe77d4609056a3c41a543a59b99";

export const STRUCT_ATTESTATION = `${PACKAGE_ID}::protocol::Suirify_Attestation`;

export const DEFAULT_EXPLORER_BASE = "https://suiscan.xyz/devnet"; // Sui explorer

export const explorer = {
  tx: (digest: string) => `${DEFAULT_EXPLORER_BASE}/tx/${digest}`,
  object: (id: string) => `${DEFAULT_EXPLORER_BASE}/object/${id}`,
};

export type AttestationStatus = "ACTIVE" | "EXPIRED" | "REVOKED" | "PENDING_BURN";
