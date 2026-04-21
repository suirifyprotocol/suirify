const fetch = globalThis.fetch || require('node-fetch');

let SuiGrpcClient = null;
let SuiClient = null;
let getFullnodeUrl = null;

try {
  ({ SuiGrpcClient } = require('@mysten/sui/grpc'));
} catch (_e) {
  SuiGrpcClient = null;
}

try {
  const sui = require('@mysten/sui');
  SuiClient = sui.SuiClient || (sui.client && sui.client.SuiClient) || null;
  getFullnodeUrl = sui.getFullnodeUrl || (sui.client && sui.client.getFullnodeUrl) || null;
} catch (_e1) {
  try {
    ({ SuiClient, getFullnodeUrl } = require('@mysten/sui/client'));
  } catch (_e2) {
    SuiClient = null;
    getFullnodeUrl = (net) => (net === 'mainnet' ? 'https://fullnode.mainnet.sui.io:443' : 'https://fullnode.testnet.sui.io:443');
  }
}

const network = process.env.SUI_NETWORK || 'testnet';
const fallbackGrpc = typeof getFullnodeUrl === 'function' ? getFullnodeUrl(network) : 'https://fullnode.testnet.sui.io:443';
const SUI_GRPC = process.env.SUI_GRPC || process.env.SUI_RPC || fallbackGrpc;
const parseEndpointList = (value) => {
  if (!value || typeof value !== 'string') return [];
  return value
    .split(/[\n,\s]+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
};
const dedupeEndpointList = (entries) => {
  const seen = new Set();
  const result = [];
  for (const entry of entries) {
    if (!entry || seen.has(entry)) continue;
    seen.add(entry);
    result.push(entry);
  }
  return result;
};
const SUI_GRAPHQL_CANDIDATES = dedupeEndpointList([
  ...parseEndpointList(process.env.SUI_GRAPHQL || process.env.SUI_GRAPHQL_RPC || ''),
  ...parseEndpointList(process.env.SUI_GRAPHQL_LIST || ''),
]);
const PACKAGE_ID = process.env.PACKAGE_ID || null;

async function checkGraphqlFallback() {
  if (!SUI_GRAPHQL_CANDIDATES.length) {
    throw new Error('No GraphQL fallback endpoint configured (SUI_GRAPHQL/SUI_GRAPHQL_LIST).');
  }
  const query = '{ chainIdentifier }';
  let lastError = null;
  for (const endpoint of SUI_GRAPHQL_CANDIDATES) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });
      if (!res.ok) {
        throw new Error(`GraphQL request failed with status ${res.status}`);
      }
      const body = await res.json();
      if (body && body.data && body.data.chainIdentifier) {
        console.log(`✓ GraphQL responsive (${endpoint}): chainIdentifier=${body.data.chainIdentifier}`);
        return;
      }
      throw new Error(`Unexpected GraphQL response: ${JSON.stringify(body)}`);
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError || new Error('All configured GraphQL endpoints failed.');
}

(async () => {
  console.log('SUI Health Check (gRPC primary, GraphQL fallback)');
  console.log(`- gRPC endpoint: ${SUI_GRPC}`);
  console.log(`- GraphQL fallback endpoints: ${SUI_GRAPHQL_CANDIDATES.length ? SUI_GRAPHQL_CANDIDATES.join(', ') : 'not configured'}`);

  let grpcReady = false;
  try {
    if (!SuiGrpcClient) {
      throw new Error('SuiGrpcClient is unavailable in installed @mysten/sui version.');
    }

    const grpcClient = new SuiGrpcClient({ baseUrl: SUI_GRPC, network });

    if (grpcClient.ledgerService && typeof grpcClient.ledgerService.getEpoch === 'function') {
      const epochResult = await grpcClient.ledgerService.getEpoch({});
      const epoch = epochResult && epochResult.response ? epochResult.response.epochId : null;
      console.log(`✓ gRPC responsive: currentEpoch=${epoch !== null && epoch !== undefined ? String(epoch) : 'unknown'}`);
    } else {
      console.warn('⚠ gRPC client does not expose ledgerService.getEpoch; skipping epoch probe.');
    }

    if (PACKAGE_ID) {
      if (grpcClient.core && typeof grpcClient.core.getObjects === 'function') {
        const response = await grpcClient.core.getObjects({ objectIds: [PACKAGE_ID] });
        if (!response?.objects?.[0]) {
          throw new Error('Package object lookup returned empty response from gRPC core client.');
        }
        console.log('✓ Package object lookup successful (gRPC core).');
      } else if (typeof grpcClient.getObject === 'function') {
        const obj = await grpcClient.getObject({ id: PACKAGE_ID });
        if (!obj) {
          throw new Error('Package object lookup returned empty response from gRPC client.');
        }
        console.log('✓ Package object lookup successful (gRPC).');
      } else {
        console.warn('⚠ gRPC package lookup skipped: no compatible object lookup method exposed.');
      }
    }

    grpcReady = true;
  } catch (err) {
    console.warn(`⚠ gRPC check failed: ${err && err.message ? err.message : err}`);
  }

  if (!grpcReady) {
    try {
      await checkGraphqlFallback();

      if (PACKAGE_ID && SuiClient) {
        const legacy = new SuiClient({ url: SUI_GRPC });
        await legacy.getObject({ id: PACKAGE_ID });
      }

      console.log('✓ Health check passed using GraphQL fallback.');
      process.exit(0);
    } catch (fallbackErr) {
      console.error('✖ GraphQL fallback failed:', fallbackErr && fallbackErr.message ? fallbackErr.message : fallbackErr);
      process.exit(6);
    }
  }

  if (!PACKAGE_ID) {
    console.log('ℹ PACKAGE_ID not set — skipped package object lookup.');
  }
  process.exit(0);
})();
