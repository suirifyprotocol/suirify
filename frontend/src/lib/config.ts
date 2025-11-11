export const PACKAGE_ID = import.meta.env.VITE_SUIRIFY_PACKAGE_ID || "0x0";

export const STRUCT_ATTESTATION = `${PACKAGE_ID}::protocol::Suirify_Attestation`;

export const DEFAULT_EXPLORER_BASE = "https://suiexplorer.com"; // Sui explorer

export const explorer = {
  tx: (digest: string) => `${DEFAULT_EXPLORER_BASE}/tx/${digest}`,
  object: (id: string) => `${DEFAULT_EXPLORER_BASE}/object/${id}`,
};

export type AttestationStatus = "ACTIVE" | "EXPIRED" | "REVOKED" | "PENDING_BURN";
