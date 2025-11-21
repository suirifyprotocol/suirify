import { SuirifySdk } from "@suirify/suirifysdk";

const defaultRpc =
  (typeof window !== "undefined" && (window as any)?.SUI_RPC_URL) ||
  import.meta.env.VITE_SUI_RPC_URL ||
  "https://fullnode.devnet.sui.io:443";

const explicitType =
  (typeof window !== "undefined" && (window as any)?.SUIRIFY_ATTESTATION_TYPE) ||
  import.meta.env.VITE_SUIRIFY_ATTESTATION_TYPE;

const packageId =
  (typeof window !== "undefined" && (window as any)?.SUIRIFY_PACKAGE_ID) ||
  import.meta.env.VITE_SUIRIFY_PACKAGE_ID;

const attestationType = explicitType || (packageId ? `${packageId}::protocol::Suirify_Attestation` : undefined);

export const suirifyClient = new SuirifySdk({
  rpcUrl: defaultRpc,
  attestationType,
});
