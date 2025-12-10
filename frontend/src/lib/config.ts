export const PACKAGE_ID = import.meta.env.VITE_SUIRIFY_PACKAGE_ID || "0x3c71db613cf881d906cbe28739e9e4d932fff569fb67cb1a329a633337234f74";

export const STRUCT_ATTESTATION = `${PACKAGE_ID}::protocol::Suirify_Attestation`;

export const DEFAULT_EXPLORER_BASE = "https://suiscan.xyz/devnet"; // Sui explorer

export const explorer = {
  tx: (digest: string) => `${DEFAULT_EXPLORER_BASE}/tx/${digest}`,
  object: (id: string) => `${DEFAULT_EXPLORER_BASE}/object/${id}`,
};

export type AttestationStatus = "ACTIVE" | "EXPIRED" | "REVOKED" | "PENDING_BURN";
