export const PACKAGE_ID = import.meta.env.VITE_SUIRIFY_PACKAGE_ID || "0x49a5f126fac9c15657720c301d39670a4b1d679f0efead83260f2a5ccf7c726d";

export const STRUCT_ATTESTATION = `${PACKAGE_ID}::protocol::Suirify_Attestation`;

export const DEFAULT_EXPLORER_BASE = "https://suiscan.xyz/devnet/"; // Sui explorer

export const explorer = {
  tx: (digest: string) => `${DEFAULT_EXPLORER_BASE}/tx/${digest}`,
  object: (id: string) => `${DEFAULT_EXPLORER_BASE}/object/${id}`,
};

export type AttestationStatus = "ACTIVE" | "EXPIRED" | "REVOKED" | "PENDING_BURN";
