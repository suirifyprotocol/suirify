export const PACKAGE_ID = import.meta.env.VITE_SUIRIFY_PACKAGE_ID || "0xfaad95533f8c546fbf0d35c5a0816b5d2a86cd8a3d27d5af1a25c63bb652cb7d";

export const STRUCT_ATTESTATION = `${PACKAGE_ID}::protocol::Suirify_Attestation`;

export const DEFAULT_EXPLORER_BASE = "https://suiscan.xyz/devnet"; // Sui explorer

export const explorer = {
  tx: (digest: string) => `${DEFAULT_EXPLORER_BASE}/tx/${digest}`,
  object: (id: string) => `${DEFAULT_EXPLORER_BASE}/object/${id}`,
};

export type AttestationStatus = "ACTIVE" | "EXPIRED" | "REVOKED" | "PENDING_BURN";
