const parseJSON = <T>(value: string | undefined, fallback: T): T => {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';

export const PACKAGE_ID = import.meta.env.VITE_SUIRIFY_PACKAGE_ID ?? '';
export const ADMIN_CAP_ID = import.meta.env.VITE_SUIRIFY_ADMIN_CAP_ID ?? '';
export const PROTOCOL_CONFIG_ID =
  import.meta.env.VITE_SUIRIFY_PROTOCOL_CONFIG_ID ?? '';
export const ATTESTATION_REGISTRY_ID =
  import.meta.env.VITE_SUIRIFY_ATTESTATION_REGISTRY_ID ?? '';
export const JURISDICTION_REGISTRY_ID =
  import.meta.env.VITE_SUIRIFY_JURISDICTION_REGISTRY_ID ?? '';
export const EVM_REGISTRY_ID =
  import.meta.env.VITE_SUIRIFY_EVM_REGISTRY_ID ?? '';

export const JURISDICTION_POLICY_MAP = parseJSON<Record<string, string>>(
  import.meta.env.VITE_SUIRIFY_JURISDICTION_POLICY_MAP,
  {}
);

const DEFAULT_STRUCT_ATTESTATION =
  PACKAGE_ID ? `${PACKAGE_ID}::protocol::Suirify_Attestation` : '';

export const STRUCT_ATTESTATION =
  import.meta.env.VITE_SUIRIFY_STRUCT_ATTESTATION ?? DEFAULT_STRUCT_ATTESTATION;

export const SUI_NETWORK =
  import.meta.env.VITE_SUI_NETWORK ?? 'devnet';
export const SUI_RPC =
  import.meta.env.VITE_SUI_RPC ?? 'https://fullnode.devnet.sui.io:443';

const resolveExplorerNetwork = (network: string) => {
  const normalized = network.trim().toLowerCase();
  if (normalized === 'mainnet') return 'mainnet';
  if (normalized === 'testnet') return 'testnet';
  if (normalized === 'localnet') return 'localnet';
  return 'devnet';
};

const explorerBaseUrl =
  import.meta.env.VITE_SUI_EXPLORER_BASE_URL ?? 'https://suiexplorer.com';

const explorerNetwork = resolveExplorerNetwork(SUI_NETWORK);

const buildExplorerUrl = (kind: 'object' | 'txblock', value?: string) => {
  if (!value) return explorerBaseUrl;
  const encoded = encodeURIComponent(value);
  return `${explorerBaseUrl}/${kind}/${encoded}?network=${explorerNetwork}`;
};

export const explorer = {
  object: (id?: string) => buildExplorerUrl('object', id),
  tx: (digest?: string) => buildExplorerUrl('txblock', digest),
};