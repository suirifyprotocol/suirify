const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const os = require('os');
require('dotenv').config();
const { govLookup, normalizeCountryKey } = require('./mockDB');
const { getIsoCode, getCountryList } = require('./countryCodes');
const { getPolicyId } = require('./jurisdictionPolicies');
const db = require('./persistentDB');
let Jimp;
try {
  // Support both CommonJS and ESM default export shapes
  const _jimp = require('jimp');
  if (_jimp && typeof _jimp === 'object') {
    if (_jimp.Jimp) {
      Jimp = _jimp.Jimp;
    } else if (_jimp.default) {
      Jimp = _jimp.default;
    } else {
      Jimp = _jimp;
    }
  } else {
    Jimp = _jimp;
  }
} catch (err) {
  // If Jimp isn't installed or fails to load, keep app running with a clear warning.
  console.warn('Jimp not available:', err && err.message ? err.message : err);
  Jimp = null;
}

let activeGraphqlIndex = 0;

// Runtime SDK handles (constructors/utilities) are loaded from installed packages.
// Environment-specific values such as network, RPC URLs, IDs, and keys come from `.env` below.

function normalizeTransactionBlockModule(mod) {
  if (!mod) return null;

  const candidates = [
    mod,
    mod && mod.default,
    mod && mod.Transaction,
    mod && mod.TransactionBlock,
    mod && mod.transactions,
    mod && mod.transactions && mod.transactions.TransactionBlock,
    mod && mod.transactions && mod.transactions.Transaction,
    mod && mod.TransactionBlock && mod.TransactionBlock.TransactionBlock,
    mod && mod.TransactionBlock && mod.TransactionBlock.default,
    mod && mod.default && mod.default.TransactionBlock,
    mod && mod.default && mod.default.Transaction,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'function') {
      return candidate;
    }
  }

  if (mod && typeof mod === 'object') {
    console.warn('TransactionBlock export shape not recognised. Available keys:', Object.keys(mod));
  }

  return null;
}

function loadSuiSdkRuntime() {
  const runtime = {
    SuiClient: null,
    SuiGrpcClient: null,
    SuiGraphQLClient: null,
    getFullnodeUrl: null,
    TransactionBlock: null,
    Ed25519Keypair: null,
  };

  // CommonJS dynamic require is intentional here to support mixed SDK export shapes.
  try {
    const sui = require('@mysten/sui');
    try {
      ({ SuiGrpcClient: runtime.SuiGrpcClient } = require('@mysten/sui/grpc'));
    } catch (_e) {
      runtime.SuiGrpcClient = null;
    }
    try {
      ({ SuiGraphQLClient: runtime.SuiGraphQLClient } = require('@mysten/sui/graphql'));
    } catch (_e) {
      runtime.SuiGraphQLClient = null;
    }
    runtime.SuiClient = sui.SuiClient || (sui.client && sui.client.SuiClient) || null;
    runtime.getFullnodeUrl = sui.getFullnodeUrl || (sui.client && sui.client.getFullnodeUrl) || null;
    runtime.TransactionBlock =
      sui.TransactionBlock ||
      sui.Transaction ||
      (sui.transactions && (sui.transactions.TransactionBlock || sui.transactions.Transaction)) ||
      null;
    runtime.Ed25519Keypair = sui.Ed25519Keypair || (sui.keypairs && sui.keypairs.Ed25519Keypair) || null;
    console.log('Loaded @mysten/sui exports.');
  } catch (_e1) {
    try {
      ({ SuiClient: runtime.SuiClient, getFullnodeUrl: runtime.getFullnodeUrl } = require('@mysten/sui/client'));
      try {
        ({ SuiGrpcClient: runtime.SuiGrpcClient } = require('@mysten/sui/grpc'));
      } catch (_e) {
        runtime.SuiGrpcClient = null;
      }
      try {
        ({ SuiGraphQLClient: runtime.SuiGraphQLClient } = require('@mysten/sui/graphql'));
      } catch (_e) {
        runtime.SuiGraphQLClient = null;
      }
      const transactionsModule = require('@mysten/sui/transactions');
      runtime.TransactionBlock =
        transactionsModule.TransactionBlock ||
        transactionsModule.Transaction ||
        transactionsModule.default ||
        transactionsModule;
      ({ Ed25519Keypair: runtime.Ed25519Keypair } = require('@mysten/sui/keypairs/ed25519'));
      console.log('Loaded @mysten/sui.js subpath exports.');
    } catch (_e2) {
      console.warn('Sui client packages not found. On-chain features disabled. To enable run:');
      console.warn('  cd backend && npm install @mysten/sui');
    }
  }

  runtime.TransactionBlock = normalizeTransactionBlockModule(runtime.TransactionBlock);
  return runtime;
}

const {
  SuiClient,
  SuiGrpcClient,
  SuiGraphQLClient,
  getFullnodeUrl,
  TransactionBlock,
  Ed25519Keypair,
} = loadSuiSdkRuntime();

const app = express();
const BODY_LIMIT = process.env.REQUEST_BODY_LIMIT || '25mb';
app.use(bodyParser.json({ limit: BODY_LIMIT }));
app.use(bodyParser.urlencoded({ extended: true, limit: BODY_LIMIT }));
app.use((req, res, next) => {
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

app.get('/health', (req, res) => res.json({ ok: true, time: Date.now() }));

// Environment configuration is owned by `.env`; do not hardcode deployment values below.
// `getFullnodeUrl` from the loaded SDK is used only as a fallback when env endpoints are absent.
const PORT = Number.parseInt(process.env.PORT, 10) || 4000;
const SECRET_PEPPER = process.env.SECRET_PEPPER || '';
const SUI_NETWORK = process.env.SUI_NETWORK || 'testnet';
const DEFAULT_GRPC_BY_NETWORK = {
  devnet: 'https://fullnode.devnet.sui.io:443',
  testnet: 'https://fullnode.testnet.sui.io:443',
  mainnet: 'https://fullnode.mainnet.sui.io:443',
  localnet: 'http://127.0.0.1:9000',
};
const networkFallbackGrpc = DEFAULT_GRPC_BY_NETWORK[SUI_NETWORK] || DEFAULT_GRPC_BY_NETWORK.testnet;
const SUI_GRPC = process.env.SUI_GRPC || process.env.SUI_RPC || (typeof getFullnodeUrl === 'function' ? getFullnodeUrl(SUI_NETWORK) : networkFallbackGrpc);
const DEFAULT_GRAPHQL_BY_NETWORK = {
  devnet: '',
  testnet: '',
  mainnet: '',
  localnet: 'http://127.0.0.1:9125/graphql',
};

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

const configuredGraphql = parseEndpointList(
  process.env.SUI_GRAPHQL || process.env.SUI_GRAPHQL_RPC || process.env.SUI_GRAPHQL_LIST || ''
);
const networkDefaultGraphql = DEFAULT_GRAPHQL_BY_NETWORK[SUI_NETWORK] || '';
const SUI_GRAPHQL_CANDIDATES = dedupeEndpointList([...configuredGraphql, networkDefaultGraphql]);
const SUI_GRAPHQL = SUI_GRAPHQL_CANDIDATES[0] || '';
const FALLBACK_GRPC_BY_NETWORK = {
  devnet: [
    'https://fullnode.devnet.sui.io:443',
    'https://sui-devnet.gateway.tatum.io/',
  ],
  testnet: [
    'https://fullnode.testnet.sui.io:443',
    'https://sui-testnet.gateway.tatum.io/',
  ],
  mainnet: [
    'https://fullnode.mainnet.sui.io:443',
    'https://sui-mainnet.chainode.tech/',
  ],
  localnet: ['http://127.0.0.1:9000'],
};

const parseRpcList = (value) => {
  if (!value || typeof value !== 'string') return [];
  return value
    .split(/[,\s]+/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length);
};

const dedupeRpcList = (list) => {
  const seen = new Set();
  const result = [];
  list.forEach((entry) => {
    if (!entry || typeof entry !== 'string') return;
    const normalized = entry.trim();
    if (!normalized.length || seen.has(normalized)) return;
    seen.add(normalized);
    result.push(normalized);
  });
  return result;
};

const configuredGrpcFallbacks = parseRpcList(process.env.SUI_GRPC_LIST || process.env.SUI_RPC_LIST || process.env.SUI_GRPC_FALLBACKS || process.env.SUI_RPC_FALLBACKS || '');
const builtinFallbacks = FALLBACK_GRPC_BY_NETWORK[SUI_NETWORK] || [];
const rpcCandidateInput = [SUI_GRPC, ...configuredGrpcFallbacks, ...builtinFallbacks, networkFallbackGrpc];
const SUI_RPC_CANDIDATES = dedupeRpcList(rpcCandidateInput);
if (!SUI_RPC_CANDIDATES.length) {
  SUI_RPC_CANDIDATES.push(networkFallbackGrpc);
}

function looksLikeHttpUrl(value) {
  return typeof value === 'string' && /^https?:\/\//i.test(value.trim());
}

function logSuiEnvDiagnostics() {
  if (!looksLikeHttpUrl(SUI_GRPC)) {
    console.warn(`SUI_GRPC appears malformed: "${SUI_GRPC}". Expected an http(s) URL in .env.`);
  }
  if (!SUI_GRAPHQL_CANDIDATES.length) {
    console.warn('No GraphQL endpoint configured in .env (SUI_GRAPHQL or SUI_GRAPHQL_LIST). GraphQL fallback is disabled.');
  }
}

logSuiEnvDiagnostics();
console.log('Sui gRPC candidates:', SUI_RPC_CANDIDATES.join(', '));
console.log(`Sui GraphQL endpoints: ${SUI_GRAPHQL_CANDIDATES.length ? SUI_GRAPHQL_CANDIDATES.join(', ') : 'not configured'}`);

function buildSuiClientForUrl(rpcUrl) {
  if (!rpcUrl || !hasSuiRpcSupport()) return null;
  try {
    if (SuiGrpcClient) {
      return new SuiGrpcClient({
        network: SUI_NETWORK,
        baseUrl: rpcUrl,
      });
    }
    if (SuiClient) {
      return new SuiClient({ url: rpcUrl });
    }
  } catch (err) {
    console.error(`Failed to instantiate Sui client for ${rpcUrl}:`, err && err.message ? err.message : err);
  }
  return null;
}

async function queryGraphQL(query, variables = {}) {
  if (!SUI_GRAPHQL_CANDIDATES.length) {
    throw new Error('GraphQL endpoint is not configured. Set SUI_GRAPHQL or SUI_GRAPHQL_LIST in env.');
  }

  let lastError = null;
  const total = SUI_GRAPHQL_CANDIDATES.length;

  for (let offset = 0; offset < total; offset += 1) {
    const idx = (activeGraphqlIndex + offset) % total;
    const endpoint = SUI_GRAPHQL_CANDIDATES[idx];

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-sui-rpc-version': '1',
        },
        body: JSON.stringify({ query, variables }),
      });

      if (!res.ok) {
        throw new Error(`GraphQL request failed with status ${res.status}`);
      }

      const body = await res.json();

      if (body.errors && body.errors.length) {
        throw new Error(body.errors.map((err) => err.message).join('; '));
      }

      if (idx !== activeGraphqlIndex) {
        activeGraphqlIndex = idx;
        console.warn(`Switched active GraphQL endpoint to ${endpoint}`);
      }

      return body;
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error('All configured GraphQL endpoints failed.');
}

const OBJECT_QUERY = `
  query ObjectByAddress($id: SuiAddress!) {
    object(address: $id) {
      address
      version
      digest
      asMoveObject {
        contents {
          json
          bcs
          type { repr }
        }
      }
    }
  }
`;

const EVENT_QUERY = `
  query EventsByType($type: String, $first: Int, $after: String) {
    events(first: $first, after: $after, filter: { type: $type }) {
      pageInfo { hasNextPage endCursor }
      nodes {
        sequenceNumber
        timestamp
        sender { address }
        contents { json bcs type { repr } }
      }
    }
  }
`;

const OWNED_OBJECTS_QUERY = `
  query OwnedObjects($owner: SuiAddress!, $type: String) {
    address(address: $owner) {
      objects(filter: { type: $type }, first: 8) {
        nodes {
          address
        }
      }
    }
  }
`;

async function fetchGraphQLObject(objectId) {
  if (!objectId) return null;
  try {
    const response = await queryGraphQL(OBJECT_QUERY, { id: objectId });
    return response?.data?.object || null;
  } catch (_err) {
    return null;
  }
}

function toLegacyObjectSummary(graphqlObject) {
  if (!graphqlObject) return null;
  const fields = graphqlObject?.asMoveObject?.contents?.json || null;
  return {
    data: {
      objectId: graphqlObject.address || null,
      content: { fields },
    },
  };
}

function getMoveObjectFields(objectNode) {
  return objectNode?.asMoveObject?.contents?.json || null;
}

function extractObjectIdFromOwnedEntry(entry) {
  if (!entry || typeof entry !== 'object') return null;
  if (typeof entry.objectId === 'string' && entry.objectId) return entry.objectId;
  if (typeof entry.id === 'string' && entry.id) return entry.id;
  if (entry.data && typeof entry.data === 'object') {
    if (typeof entry.data.objectId === 'string' && entry.data.objectId) return entry.data.objectId;
    if (typeof entry.data.id === 'string' && entry.data.id) return entry.data.id;
  }
  return null;
}

function normalizeOwnedObjectIds(payload) {
  const candidates = [];
  if (Array.isArray(payload)) {
    candidates.push(...payload);
  } else if (payload && typeof payload === 'object') {
    if (Array.isArray(payload.objects)) candidates.push(...payload.objects);
    if (Array.isArray(payload.data)) candidates.push(...payload.data);
  }

  const ids = [];
  const seen = new Set();
  for (const item of candidates) {
    const objectId = extractObjectIdFromOwnedEntry(item);
    if (!objectId || seen.has(objectId)) continue;
    seen.add(objectId);
    ids.push(objectId);
  }
  return ids;
}

async function fetchOwnedAttestationObjectIdsFromClient(client, walletAddress, typeFilter) {
  if (!client || !walletAddress || !typeFilter) return [];

  if (client?.stateService && typeof client.stateService.listOwnedObjects === 'function') {
    try {
      const { response } = await client.stateService.listOwnedObjects({
        owner: walletAddress,
        objectType: typeFilter,
        pageSize: 8,
      });
      return normalizeOwnedObjectIds(response?.objects || []);
    } catch (err) {
      console.warn('gRPC listOwnedObjects failed:', err && err.message ? err.message : err);
    }
  }

  if (client?.core && typeof client.core.getOwnedObjects === 'function') {
    try {
      const response = await client.core.getOwnedObjects({
        address: walletAddress,
        objectType: typeFilter,
        options: { showContent: false },
        limit: 8,
      });
      return normalizeOwnedObjectIds(response);
    } catch (err) {
      console.warn('core.getOwnedObjects failed:', err && err.message ? err.message : err);
    }
  }

  if (typeof client.getOwnedObjects === 'function') {
    try {
      const response = await client.getOwnedObjects({
        owner: walletAddress,
        filter: { StructType: typeFilter },
        options: { showContent: false },
      });
      return normalizeOwnedObjectIds(response);
    } catch (err) {
      console.warn('getOwnedObjects failed:', err && err.message ? err.message : err);
    }
  }

  return [];
}

async function fetchOwnedAttestationObjectIdsFromGraphQL(walletAddress, typeFilter) {
  if (!walletAddress || !typeFilter || !SUI_GRAPHQL_CANDIDATES.length) return [];
  try {
    const response = await queryGraphQL(OWNED_OBJECTS_QUERY, {
      owner: walletAddress,
      type: typeFilter,
    });
    const nodes = response?.data?.address?.objects?.nodes || [];
    return nodes.map((n) => n.address).filter(Boolean);
  } catch (err) {
    console.warn('GraphQL owned-object lookup failed:', err && err.message ? err.message : err);
    return [];
  }
}

    const PACKAGE_ID = process.env.PACKAGE_ID ? process.env.PACKAGE_ID.trim() : '' ;
    const ADMIN_CAP_ID = process.env.ADMIN_CAP_ID ? process.env.ADMIN_CAP_ID.trim() : '';
    const PROTOCOL_CONFIG_ID = process.env.PROTOCOL_CONFIG_ID ? process.env.PROTOCOL_CONFIG_ID.trim() : '';
    const ATTESTATION_REGISTRY_ID = process.env.ATTESTATION_REGISTRY_ID ? process.env.ATTESTATION_REGISTRY_ID.trim() : '';
    const JURISDICTION_POLICY_ID = process.env.JURISDICTION_POLICY_ID;
    const ADMIN_PRIVATE_KEY = process.env.ADMIN_PRIVATE_KEY || process.env.SPONSOR_PRIVATE_KEY || null;
    const STATIC_MINT_FEE = process.env.MINT_FEE || null;
    const BYPASS_FACE_MATCH = process.env.BYPASS_FACE_MATCH === 'true';
    const ADMIN_API_KEY = process.env.ADMIN_API_KEY || null;
    const HOST = process.env.HOST || '0.0.0.0';
    const MIST_PER_SUI = BigInt(1_000_000_000);

    const STATUS_CODE_ACTIVE = 1;
    const STATUS_CODE_EXPIRED = 2;
    const STATUS_CODE_REVOKED = 3;

    const STATUS_CODE_TO_NAME = {
      [STATUS_CODE_ACTIVE]: 'ACTIVE',
      [STATUS_CODE_EXPIRED]: 'EXPIRED',
      [STATUS_CODE_REVOKED]: 'REVOKED',
    };

    const STATUS_NAME_TO_CODE = {
      ACTIVE: STATUS_CODE_ACTIVE,
      EXPIRED: STATUS_CODE_EXPIRED,
      REVOKED: STATUS_CODE_REVOKED,
    };

    function toBigIntOrNull(value) {
      if (value === null || value === undefined) return null;
      try {
        return BigInt(value);
      } catch (_err) {
        return null;
      }
    }

    function formatSuiFromMist(mistValue) {
      try {
        const mist = BigInt(mistValue);
        const whole = mist / MIST_PER_SUI;
        const remainder = mist % MIST_PER_SUI;
        if (remainder === BigInt(0)) {
          return whole.toString();
        }
        const remainderStr = remainder.toString().padStart(9, '0').replace(/0+$/, '');
        return `${whole.toString()}.${remainderStr}`;
      } catch (_err) {
        return null;
      }
    }

    if (BYPASS_FACE_MATCH) {
      console.warn('Face verification bypass mode enabled — similarity checks will be skipped.');
    }

    console.log(`Sui network configured: ${SUI_NETWORK} (grpc: ${SUI_GRPC})`);

    let suiClient;
    let adminKeypair;
    let activeRpcIndex = 0;
    const suiClientCache = new Map();
    const RETRYABLE_RPC_ERROR_CODES = new Set([
      'UND_ERR_CONNECT_TIMEOUT',
      'UND_ERR_HEADERS_TIMEOUT',
      'UND_ERR_SOCKET',
      'UND_ERR_BODY_TIMEOUT',
      'UND_ERR_RESPONSE_STATUS_CODE',
      'UND_ERR_ABORTED',
      'ECONNRESET',
      'ECONNREFUSED',
      'ETIMEDOUT',
      'EHOSTUNREACH',
      'ENETUNREACH',
    ]);

    const ActiveSuiClientCtor = SuiGrpcClient || SuiClient;
    const hasSuiRpcSupport = () => typeof ActiveSuiClientCtor === 'function' && SUI_RPC_CANDIDATES.length > 0;

    function getSuiSdkModeSummary() {
      const primary = SuiGrpcClient ? 'grpc' : SuiClient ? 'legacy-rpc' : 'none';
      const fallback = SuiGraphQLClient && SUI_GRAPHQL_CANDIDATES.length > 0 ? 'graphql-enabled' : 'graphql-disabled';
      return `primary=${primary}, fallback=${fallback}`;
    }

    console.log(`Sui SDK mode: ${getSuiSdkModeSummary()}`);

    function getOrCreateSuiClientForUrl(rpcUrl) {
      if (!rpcUrl || !hasSuiRpcSupport()) return null;
      if (suiClientCache.has(rpcUrl)) {
        return suiClientCache.get(rpcUrl);
      }
      try {
        const client = buildSuiClientForUrl(rpcUrl);
        suiClientCache.set(rpcUrl, client);
        console.log(`Sui client instantiated (${SuiGrpcClient ? 'grpc' : 'rpc'}=${rpcUrl}).`);
        return client;
      } catch (err) {
        console.error(`Failed to instantiate Sui client for ${rpcUrl}:`, err && err.message ? err.message : err);
        return null;
      }
    }

    const describeRpcError = (error) => {
      if (!error) return 'unknown error';
      const parts = [];
      const root = error.cause || error;
      if (root.code) parts.push(root.code);
      if (error.message) {
        parts.push(error.message);
      } else if (root.message) {
        parts.push(root.message);
      }
      return parts.length ? parts.join(' — ') : String(error);
    };

    function isRetryableRpcError(error) {
      if (!error) return false;
      const root = error.cause || error;
      if (root && root.code && RETRYABLE_RPC_ERROR_CODES.has(root.code)) {
        return true;
      }
      const message = (root && root.message ? root.message : error.message || '').toLowerCase();
      if (!message) return false;
      return (
        message.includes('fetch failed') ||
        message.includes('timeout') ||
        message.includes('network') ||
        message.includes('connect') ||
        message.includes('socket')
      );
    }

    async function withSuiClient(operationName, handler) {
      if (!hasSuiRpcSupport()) {
        throw new Error('Sui client is not configured.');
      }

      let lastError = null;
      const total = SUI_RPC_CANDIDATES.length;
      for (let offset = 0; offset < total; offset += 1) {
        const candidateIndex = (activeRpcIndex + offset) % total;
        const rpcUrl = SUI_RPC_CANDIDATES[candidateIndex];
        const client = getOrCreateSuiClientForUrl(rpcUrl);
        if (!client) {
          lastError = new Error(`Unable to instantiate Sui client for ${rpcUrl}`);
          continue;
        }
        try {
          const result = await handler(client, rpcUrl);
          suiClient = client;
          if (candidateIndex !== activeRpcIndex) {
            console.log(`Switched active Sui RPC to ${rpcUrl} for ${operationName}.`);
            activeRpcIndex = candidateIndex;
          }
          return result;
        } catch (err) {
          lastError = err;
          if (!isRetryableRpcError(err) || total === 1) {
            throw err;
          }
          console.warn(`[${operationName}] RPC ${rpcUrl} failed (${describeRpcError(err)}). Trying next endpoint...`);
        }
      }

      throw lastError || new Error('All configured Sui RPC endpoints failed.');
    }

    // Instantiate Sui client when available; load admin signer only if provided.
    try {
      if (hasSuiRpcSupport()) {
        const initialClient = getOrCreateSuiClientForUrl(SUI_RPC_CANDIDATES[0]);
        if (initialClient) {
          suiClient = initialClient;
          activeRpcIndex = 0;
        } else {
          console.error('Failed to instantiate initial Sui client. Will attempt again on demand.');
        }
      } else {
        console.warn('Sui client constructor not found in @mysten/sui exports. On-chain features disabled.');
      }

    	if (ADMIN_PRIVATE_KEY) {
        if (Ed25519Keypair && typeof Ed25519Keypair.fromSecretKey === 'function') {
          try {
            const tryLoadAdminKeypair = (rawValue) => {
              try {
                return Ed25519Keypair.fromSecretKey(rawValue);
              } catch (err1) {
                try {
                  const decoded = Buffer.from(rawValue, 'base64');
                  let secretBytes;
                  if (decoded.length === 33 && decoded[0] === 0) {
                    secretBytes = decoded.slice(1, 33);
                  } else if (decoded.length === 64) {
                    secretBytes = decoded.slice(0, 32);
                  } else if (decoded.length === 65) {
                    secretBytes = decoded.slice(1, 33);
                  } else if (decoded.length >= 32) {
                    secretBytes = decoded.slice(0, 32);
                  } else {
                    secretBytes = decoded;
                  }
                  return Ed25519Keypair.fromSecretKey(secretBytes);
                } catch (err2) {
                  throw err1;
                }
              }
            };
            adminKeypair = tryLoadAdminKeypair(ADMIN_PRIVATE_KEY);
            console.log(`Admin signer loaded: ${adminKeypair.getPublicKey().toSuiAddress()}`);
          } catch (e) {
            console.error('Failed to load ADMIN_PRIVATE_KEY. Provide either a sui encoded secret key (suiprivkey...) or a base64 seed.', e);
            adminKeypair = null;
          }
    		} else {
    			console.warn('ADMIN_PRIVATE_KEY provided but Ed25519Keypair helper not available. On-chain mint finalization disabled.');
    		}
    	} else {
    		console.info('No ADMIN_PRIVATE_KEY provided. Transactions will require manual signing.');
    	}

    	if (!PACKAGE_ID) {
    		console.warn('PACKAGE_ID not set. On-chain mint operations will fail until PACKAGE_ID is configured.');
    	}
    	if (!ADMIN_CAP_ID || !PROTOCOL_CONFIG_ID || !ATTESTATION_REGISTRY_ID) {
    		console.warn('One or more protocol env IDs (ADMIN_CAP_ID, PROTOCOL_CONFIG_ID, ATTESTATION_REGISTRY_ID) are not set. Some on-chain calls may fail.');
    	}
      if (ADMIN_API_KEY) {
        console.log('Admin API key configured — admin endpoints enabled.');
      } else {
        console.warn('ADMIN_API_KEY not set. Admin maintenance endpoints will be disabled.');
      }
    } catch (outerErr) {
    	console.error('Unexpected error during Sui client / admin initialization:', outerErr);
    	suiClient = null;
    	adminKeypair = null;
    }

    const verificationSessionStore = new Map();
    const pendingMints = new Map();
    const consumedMintRequests = new Set();
    let attestationIndexerCursor = null;

    function summarizeAttestationObject(attestationObject) {
      if (!attestationObject || attestationObject.error) return null;
      const data = attestationObject.data || {};
      const content = data.content || {};
      const fields = content.fields || null;
      if (!fields || !data.objectId) return null;

      const toNumberOrNull = (value) => {
        if (value === null || value === undefined) return null;
        const num = Number(value);
        return Number.isFinite(num) ? num : null;
      };

      const issueDateMs = toNumberOrNull(fields.issue_time_ms);
      const expiryDateMs = toNumberOrNull(fields.expiry_time_ms);
      const rawStatus = fields.status;
      const numericStatus = rawStatus !== undefined && rawStatus !== null ? Number(rawStatus) : null;
      const revoked = Boolean(fields.revoked);
      let statusCode = Number.isFinite(numericStatus) ? numericStatus : null;
      let status = null;
      if (statusCode && STATUS_CODE_TO_NAME[statusCode]) {
        status = STATUS_CODE_TO_NAME[statusCode];
      } else if (rawStatus !== undefined && rawStatus !== null) {
        status = String(rawStatus).toUpperCase();
      }
      if (revoked) {
        status = 'REVOKED';
        statusCode = STATUS_CODE_REVOKED;
      }
      if (!status) {
        status = 'ACTIVE';
      }
      if (!statusCode && STATUS_NAME_TO_CODE[status]) {
        statusCode = STATUS_NAME_TO_CODE[status];
      }
      const statusLabel = status === 'ACTIVE' ? 'Active' : status === 'REVOKED' ? 'Revoked' : status === 'EXPIRED' ? 'Expired' : status;
      const isExpired = expiryDateMs !== null && Date.now() > expiryDateMs;
      const isValid = status === 'ACTIVE' && !isExpired;
      const jurisdictionCode = toNumberOrNull(fields.jurisdiction_code);
      const verificationLevel = toNumberOrNull(fields.verification_level);

      return {
        objectId: data.objectId,
        jurisdictionCode,
        verificationLevel,
        issueDateMs,
        expiryDateMs,
        status,
        statusLabel,
        statusCode,
        revoked,
        isValid,
      };
    }

    function summarizeStoredAttestation(walletAddress) {
      if (!db || typeof db.getAttestationSummaryForWallet !== 'function') return null;
      const stored = db.getAttestationSummaryForWallet(walletAddress);
      if (!stored || !stored.record) return null;
      const statusCode = stored.statusCode ?? (stored.status ? STATUS_NAME_TO_CODE[String(stored.status).toUpperCase()] : null);
      const status = stored.status ? String(stored.status).toUpperCase() : (statusCode && STATUS_CODE_TO_NAME[statusCode]) || 'ACTIVE';
      const statusLabel = stored.statusLabel || (status === 'ACTIVE' ? 'Active' : status === 'REVOKED' ? 'Revoked' : status === 'EXPIRED' ? 'Expired' : status);
      const issueDateMs = stored.issueDateMs ?? null;
      const expiryDateMs = stored.expiryDateMs ?? null;
      const isExpired = expiryDateMs !== null && Date.now() > expiryDateMs;
      const isValid = status === 'ACTIVE' && !isExpired;

      return {
        objectId: stored.attestationId || null,
        jurisdictionCode: stored.jurisdictionCode ?? null,
        verificationLevel: stored.verificationLevel ?? null,
        issueDateMs,
        expiryDateMs,
        status,
        statusLabel,
        statusCode: statusCode ?? (STATUS_NAME_TO_CODE[status] || null),
        revoked: status === 'REVOKED',
        isValid,
        source: 'db',
      };
    }

    async function extractAttestationFromChanges(objectChanges) {
      if (!Array.isArray(objectChanges)) return null;
      for (const change of objectChanges) {
        if (!change || typeof change !== 'object') continue;
        const objectId = change.id || change.objectId || null;
        if (!objectId) continue;
        const graphqlObject = await fetchGraphQLObject(objectId);
        const objectType = graphqlObject?.asMoveObject?.contents?.type?.repr || null;
        if (!objectType || objectType !== `${PACKAGE_ID}::protocol::Suirify_Attestation`) continue;
        const summary = summarizeAttestationObject(toLegacyObjectSummary(graphqlObject));
        if (summary) {
          return summary;
        }
      }
      return null;
    }

    async function getExistingAttestation(walletAddress) {
      if (!hasSuiRpcSupport() || !PACKAGE_ID || !walletAddress) return null;
      try {
        const typeFilter = `${PACKAGE_ID.trim()}::protocol::Suirify_Attestation`;

        let ownedObjectIds = [];
        try {
          ownedObjectIds = await withSuiClient('attestation.lookup', async (client) => (
            fetchOwnedAttestationObjectIdsFromClient(client, walletAddress, typeFilter)
          ));
        } catch (rpcErr) {
          console.warn('RPC owned-object lookup failed; trying GraphQL fallback:', rpcErr && rpcErr.message ? rpcErr.message : rpcErr);
        }

        if (!ownedObjectIds.length) {
          ownedObjectIds = await fetchOwnedAttestationObjectIdsFromGraphQL(walletAddress, typeFilter);
        }

        const firstObjectId = ownedObjectIds[0] || null;
        if (!firstObjectId) return null;

        const graphqlObject = await fetchGraphQLObject(firstObjectId);
        const summary = summarizeAttestationObject(toLegacyObjectSummary(graphqlObject));
        if (!summary) {
          return {
            objectId: firstObjectId,
            jurisdictionCode: null,
            verificationLevel: null,
            issueDateMs: null,
            expiryDateMs: null,
            status: 'ACTIVE',
            statusLabel: 'Active',
            statusCode: STATUS_CODE_ACTIVE,
            revoked: false,
            isValid: true,
            source: 'chain-minimal',
          };
        }
        return {
          objectId: summary.objectId,
          jurisdictionCode: summary.jurisdictionCode,
          verificationLevel: summary.verificationLevel,
          issueDateMs: summary.issueDateMs,
          expiryDateMs: summary.expiryDateMs,
          status: summary.status,
          statusLabel: summary.statusLabel,
          statusCode: summary.statusCode,
          revoked: summary.revoked,
          isValid: summary.isValid,
          source: 'chain',
        };
      } catch (err) {
        console.error('Failed to load existing attestation for wallet', walletAddress, err);
        return null;
      }
    }

    async function getLatestPendingMintRequest(walletAddress, limit = 20, preferredRequestId = null) {
      if (!hasSuiRpcSupport() || !PACKAGE_ID || !walletAddress) return null;
      try {
        const normalizedWallet = typeof walletAddress === 'string' ? walletAddress.trim() : walletAddress;
        if (!normalizedWallet) {
          return null;
        }
        const response = await queryGraphQL(EVENT_QUERY, {
          type: `${PACKAGE_ID}::protocol::MintRequestCreated`,
          first: Math.min(Math.max(limit, 1), 100),
          after: null,
        });
        const events = Array.isArray(response?.data?.events?.nodes) ? response.data.events.nodes.slice() : [];
        events.sort((a, b) => {
          const aTs = a?.timestamp ? new Date(a.timestamp).getTime() : 0;
          const bTs = b?.timestamp ? new Date(b.timestamp).getTime() : 0;
          return bTs - aTs;
        });

      let fallbackMatch = null;
      const preferLower = typeof preferredRequestId === 'string' ? preferredRequestId.toLowerCase() : null;

      for (const event of events) {
          const parsed = event?.contents?.json || {};
          const requestId = parsed.request_id || parsed.requestId || null;
          const requester = parsed.requester || parsed.requester_address || parsed.recipient || null;
          if (!requestId || typeof requestId !== 'string' || !requester) continue;
      if (requester.toLowerCase() !== normalizedWallet.toLowerCase()) continue;
          if (isRequestConsumed(requestId)) continue;

          const digest = event?.transaction?.digest || event?.transactionDigest || event?.digest || null;
          const eventSeq = event?.sequenceNumber !== undefined ? event.sequenceNumber : null;

          const record = {
            requestId,
            requestTxDigest: digest,
            eventSequence: eventSeq,
            timestampMs: event?.timestamp || null,
            requester,
          };

          if (preferLower && requestId.toLowerCase() === preferLower) {
            return record;
          }

          if (!fallbackMatch) {
            fallbackMatch = record;
          }
        }
        if (fallbackMatch) {
          return fallbackMatch;
        }
      } catch (error) {
        console.error('Failed to lookup pending mint request for wallet', walletAddress, error);
      }
      return null;
    }

    if (typeof db.getAllConsumedMintRequests === 'function') {
      try {
        const existingConsumed = db.getAllConsumedMintRequests();
        existingConsumed.forEach((entry) => {
          if (entry && entry.requestId) {
            consumedMintRequests.add(entry.requestId.toLowerCase());
          }
        });
        if (existingConsumed.length) {
          console.log(`Loaded ${existingConsumed.length} consumed mint request(s) from persistent storage.`);
        }
      } catch (_err) {
        // ignore preload errors
      }
    }

const ADMIN_HEADER_KEY = 'x-admin-key';

function isRequestConsumed(requestId) {
  if (!requestId || typeof requestId !== 'string') return false;
  const lower = requestId.toLowerCase();
  return consumedMintRequests.has(lower) || (typeof db.isMintRequestConsumed === 'function' && db.isMintRequestConsumed(lower));
}

function markRequestConsumed(requestId, metadata) {
  if (!requestId || typeof requestId !== 'string') return;
  const lower = requestId.toLowerCase();
  consumedMintRequests.add(lower);
  if (typeof db.markMintRequestConsumed === 'function') {
    const safeMetadata = Object.assign({}, metadata || {});
    if (!safeMetadata.eventType) safeMetadata.eventType = 'consumed';
    db.markMintRequestConsumed(lower, Object.assign({}, safeMetadata, { originalRequestId: requestId }));
  }
}

function requireAdmin(req, res, next) {
  if (!ADMIN_API_KEY) {
    return res.status(503).json({ error: 'ADMIN_API_KEY not configured on the server.' });
  }
  const provided = req.headers[ADMIN_HEADER_KEY] || req.headers['x-admin-token'];
  const value = Array.isArray(provided) ? provided[0] : provided;
  if (value !== ADMIN_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized admin request.' });
  }
  return next();
}

// Replace previous normalizeName and sha256ToU8Array with robust implementations
const normalizeName = (name) => {
  if (!name || typeof name !== 'string') return '';
  // Unicode normalize, remove combining marks (diacritics), collapse whitespace and lowercase
  const nfk = name.normalize('NFKC');
  // remove diacritics / combining marks
  const stripped = nfk.replace(/\p{M}/gu, '');
  return stripped.trim().toLowerCase().replace(/\s+/g, ' ');
};

/**
 * Build a deterministic, versioned name-hash.
 * - Uses a canonical separator and a version prefix so the scheme can evolve.
 * - Returns a Uint8Array of length 32 (SHA-256).
 */
function buildNameHash(normalizedName, walletAddress, pepper, version = 1) {
  const separator = '|';
  const prefix = `v${version}${separator}`;
  const payload = `${prefix}${normalizedName}${separator}${walletAddress}${separator}${pepper}`;
  const hashBuf = crypto.createHash('sha256').update(Buffer.from(payload, 'utf8')).digest();
  if (!hashBuf || hashBuf.length !== 32) {
    throw new Error('unexpected hash length from SHA-256');
  }
  return new Uint8Array(hashBuf);
}

const hashFullNameForStorage = (fullName) => {
  if (!fullName || typeof fullName !== 'string') return null;
  const normalized = normalizeName(fullName);
  if (!normalized) return null;
  const payload = `audit-name:v1|${normalized}|${SECRET_PEPPER}`;
  return crypto.createHash('sha256').update(Buffer.from(payload, 'utf8')).digest('hex');
};

function resolveVerificationLevelFromDocument(govRecord) {
  if (!govRecord || !govRecord.documentType) return 2;
  const raw = String(govRecord.documentType).trim().toLowerCase();
  if (!raw) return 2;
  const normalized = raw.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  const compact = normalized.replace(/\s+/g, '');
  const nationalIdKeywords = [
    'national id',
    'national identification',
    'identity card',
    'id card',
    'nin',
    'nid',
    'ssn',
    'bvn',
  ];
  const matchesKeyword = nationalIdKeywords.some((kw) => normalized.includes(kw) || compact === kw.replace(/\s+/g, ''));
  if (matchesKeyword) {
    return 1;
  }
  return 2;
}

async function signTransactionWithKeypair(keypair, txBytes) {
  if (!keypair) {
    throw new Error('Keypair is not configured.');
  }

  const bytes = txBytes instanceof Uint8Array ? txBytes : Uint8Array.from(txBytes);
  const base64 = Buffer.from(bytes).toString('base64');
  const attempts = [
    ['signTransactionBlock', bytes],
    ['signTransaction', bytes],
    ['signTransaction', base64],
    ['sign', bytes],
  ];

  for (const [method, arg] of attempts) {
    const fn = keypair[method];
    if (typeof fn !== 'function') continue;
    try {
      const maybePromise = fn.call(keypair, arg);
      const payload = maybePromise && typeof maybePromise.then === 'function' ? await maybePromise : maybePromise;
      let signature = payload && payload.signature !== undefined ? payload.signature : payload;
      if (Array.isArray(signature)) {
        [signature] = signature;
      }
      if (signature instanceof Uint8Array) {
        signature = Buffer.from(signature).toString('base64');
      }
      if (typeof signature === 'string') {
        return signature;
      }
    } catch (err) {
      console.warn(`Admin keypair ${method} failed:`, err && err.message ? err.message : err);
    }
  }

  throw new Error('Admin keypair does not support transaction signing with the available methods.');
}

app.get('/ready', (req, res) => {
  const checks = {
    sui: hasSuiRpcSupport(),
    azureFace: Boolean(AZURE_FACE_KEY)
  };
  const isReady = Object.values(checks).every(Boolean);
  res.status(isReady ? 200 : 503).json({
    ready: isReady,
    checks,
    suiSdkMode: getSuiSdkModeSummary(),
    time: Date.now(),
  });
});

/**
 * ENDPOINT 1: Check for an existing attestation & get dashboard data.
 */
app.get('/attestation/:walletAddress', async (req, res) => {
  if (!hasSuiRpcSupport()) return res.status(500).json({ error: 'Sui client is not configured.' });
  const { walletAddress } = req.params;
  try {
    const toIsoOrNull = (ms) => {
      if (ms === null || ms === undefined) return null;
      const date = new Date(ms);
      return Number.isNaN(date.getTime()) ? null : date.toISOString();
    };

    // Chain is the source of truth for attestation discovery.
    // DB is only used for fallback/enrichment when chain metadata is partial.
    const chainSummary = await getExistingAttestation(walletAddress);
    const storedSummary = summarizeStoredAttestation(walletAddress);

    if (chainSummary && chainSummary.objectId) {
      const mergedSummary = {
        ...chainSummary,
        jurisdictionCode: chainSummary.jurisdictionCode ?? storedSummary?.jurisdictionCode ?? null,
        verificationLevel: chainSummary.verificationLevel ?? storedSummary?.verificationLevel ?? null,
        issueDateMs: chainSummary.issueDateMs ?? storedSummary?.issueDateMs ?? null,
        expiryDateMs: chainSummary.expiryDateMs ?? storedSummary?.expiryDateMs ?? null,
      };

      const dashboardData = {
        objectId: mergedSummary.objectId,
        jurisdictionCode: mergedSummary.jurisdictionCode,
        verificationLevel: mergedSummary.verificationLevel,
        issueDate: toIsoOrNull(mergedSummary.issueDateMs),
        expiryDate: toIsoOrNull(mergedSummary.expiryDateMs),
        status: mergedSummary.statusLabel || mergedSummary.status,
        statusCode: mergedSummary.statusCode,
        revoked: Boolean(mergedSummary.revoked),
      };
      return res.json({
        hasAttestation: true,
        isValid: Boolean(mergedSummary.isValid),
        data: dashboardData,
        source: mergedSummary.source || 'chain',
      });
    }

    if (storedSummary && storedSummary.objectId) {
      const dashboardData = {
        objectId: storedSummary.objectId,
        jurisdictionCode: storedSummary.jurisdictionCode,
        verificationLevel: storedSummary.verificationLevel,
        issueDate: toIsoOrNull(storedSummary.issueDateMs),
        expiryDate: toIsoOrNull(storedSummary.expiryDateMs),
        status: storedSummary.statusLabel || storedSummary.status,
        statusCode: storedSummary.statusCode,
        revoked: Boolean(storedSummary.revoked),
      };
      return res.json({
        hasAttestation: true,
        isValid: Boolean(storedSummary.isValid),
        data: dashboardData,
        source: 'db-fallback',
      });
    }

    return res.json({ hasAttestation: false, isValid: false, data: null, source: 'none' });
  } catch (error) {
    console.error(`Error fetching attestation for ${req.params.walletAddress}:`, error);
    res.status(500).json({ error: 'Failed to query the blockchain.' });
  }
});

/**
 * ENDPOINT: expose countries list for frontend dropdown
 */
app.get('/countries', (req, res) => {
  try {
    const list = getCountryList(); // returns rich metadata from countryCodes.js
    const payload = list.map((c) => ({
      name: c.name,
      localName: c.localName,
      iso: c.iso,
      alpha2: c.alpha2,
      alpha3: c.alpha3,
      label: c.localName && c.localName.length ? c.localName : c.name, // frontend-friendly
    }));
    res.json({ success: true, countries: payload });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Failed to load countries' });
  }
});

/**
 * ENDPOINT 2: Start the verification process with uniqueness check.
 */
function handleStartVerification(req, res) {
  const { country, idNumber } = req.body;
  if (!country || !idNumber) return res.status(400).json({ error: 'Country and idNumber are required.' });

  const normCountry = normalizeCountryKey(country);

  // ensure we support this country (resolve ISO)
  const iso = getIsoCode(normCountry);
  if (iso === null) {
    return res.status(400).json({ error: `Unsupported country: ${country}. Please choose from /countries.` });
  }

  // Use high-level PersistentDB API to check usage
  if (db.hasUsedGovId(normCountry, idNumber)) {
    const existing = db.getUsedGovId(normCountry, idNumber) || {};
    console.error(`[Verification Error] /start-verification: ID ${idNumber} (${normCountry}) has already been used by ${existing.walletAddress}.`);
    return res.status(409).json({
      error: 'This Government ID has already been used to mint an attestation.',
      existingWallet: existing.walletAddress || null
    });
  }

  const record = govLookup(normCountry, idNumber);
  if (!record) {
    console.error(`[Verification Error] /start-verification: ID ${idNumber} (${normCountry}) not found in mock database.`);
    return res.status(404).json({ error: 'ID not found in the government database.' });
  }

  const sessionId = crypto.randomBytes(16).toString('hex');

  // Resolve country-specific jurisdiction policy id (may come from env map or defaults)
  const policyId = getPolicyId(normCountry) || JURISDICTION_POLICY_ID || null;
  if (!policyId) {
    // allow session creation but warn; creation can proceed if policy is optional downstream
    console.warn(`No jurisdiction policy id configured for country ${normCountry}.`);
  }

  // store resolved iso code and policyId so later steps don't need to re-resolve
  verificationSessionStore.set(sessionId, { govRecord: record, country: normCountry, idNumber, jurisdictionCode: iso, policyId });
  res.json({ success: true, sessionId });
}

app.post('/start-verification', handleStartVerification);
app.post('/api/verify/start', handleStartVerification);

/**
 * ENDPOINT 3: Complete verification after successful face scan.
 */
async function handleCompleteVerification(req, res) {
  try {
    const { sessionId, walletAddress } = req.body;
    if (!sessionId || !walletAddress) {
      return res.status(400).json({ error: 'SessionID and walletAddress are required.' });
    }

    const sessionData = verificationSessionStore.get(sessionId);
    if (!sessionData) {
      return res.status(404).json({ error: 'Verification session not found or expired.' });
    }

    const { govRecord, jurisdictionCode: resolvedIso } = sessionData;
    if (!sessionData.faceVerification || !sessionData.faceVerification.match) {
      console.error(`[Verification Error] /complete-verification: Face match not completed or failed for session ${sessionId}. Current faceVerification status: ${JSON.stringify(sessionData.faceVerification)}`);
      return res.status(403).json({ error: 'Identity verification (face match) is required before proceeding.' });
    }
    const normalizedName = normalizeName(govRecord.fullName);

    let nameHash;
    try {
      nameHash = buildNameHash(normalizedName, walletAddress, SECRET_PEPPER, 1);
    } catch (e) {
      console.error('Failed to build name hash:', e);
      return res.status(500).json({ error: 'Failed to build name hash.' });
    }

    const birthDate = new Date(govRecord.dateOfBirth);
    const age = new Date(Date.now() - birthDate.getTime()).getUTCFullYear() - 1970;
    const isOver18 = age >= 18;
    const verificationLevel = resolveVerificationLevelFromDocument(govRecord);

    sessionData.preparedData = {
      userWalletAddress: walletAddress,
      jurisdictionCode: resolvedIso,
      verifierSource: 1,
      verificationLevel,
      nameHash,
      isHumanVerified: true,
      isOver18,
      verifierVersion: 1,
    };

    const resolvedPhoto = await resolvePhotoReference(govRecord.photoReference);
    if (resolvedPhoto) {
      sessionData.govRecord.photoReference = resolvedPhoto;
    }

    verificationSessionStore.set(sessionId, sessionData);

    console.debug('Prepared nameHash (hex):', Buffer.from(nameHash).toString('hex'));

    res.json({ success: true, consentData: { ...sessionData.govRecord } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected verification error.';
    console.error('complete-verification error:', message);
    return res.status(500).json({ error: 'Failed to complete verification.' });
  }
}

app.post('/complete-verification', handleCompleteVerification);
app.post('/api/verify/submit', handleCompleteVerification);

app.get('/api/dashboard/compliance', (req, res) => {
  const now = Date.now();
  return res.json({
    platformId: req.query.platform_id || 'suirify_launchpad_demo',
    kycRate: 0.917,
    activeAttestations: 1824,
    expiredAttestations: 136,
    failedVerifications: 47,
    avgFaceMatchConfidence: 0.89,
    avgLivenessConfidence: 0.96,
    monthlyVolume: [
      { month: 'Nov', verifiedCount: 290, failedCount: 7 },
      { month: 'Dec', verifiedCount: 335, failedCount: 10 },
      { month: 'Jan', verifiedCount: 322, failedCount: 9 },
      { month: 'Feb', verifiedCount: 351, failedCount: 8 },
      { month: 'Mar', verifiedCount: 344, failedCount: 6 },
      { month: 'Apr', verifiedCount: 182, failedCount: 7 },
    ],
    frameworkCoverage: [
      {
        frameworkId: 'CBN_KYC_2023',
        requiredClaims: ['nin_verified', 'face_matched', 'liveness_passed', 'is_human_verified'],
        passRate: 0.93,
      },
      {
        frameworkId: 'NDPA_2023',
        requiredClaims: ['pii_not_stored', 'consent_recorded', 'is_human_verified'],
        passRate: 0.98,
      },
      {
        frameworkId: 'NITDA_COP_2022',
        requiredClaims: ['nin_verified', 'is_human_verified'],
        passRate: 0.95,
      },
      {
        frameworkId: 'SEC_2024',
        requiredClaims: ['nin_verified', 'face_matched', 'liveness_passed', 'is_over_18'],
        passRate: 0.91,
      },
    ],
    recentFailures: [
      {
        id: 'fail_001',
        timestamp: now - 2 * 60 * 1000,
        platformId: 'suirify_launchpad_demo',
        errorCode: 'LIVENESS_FAILED',
        faceMatchConfidence: 0.79,
        livenessConfidence: 0.54,
        rulesEngineResult: 'FAIL',
      },
      {
        id: 'fail_002',
        timestamp: now - 8 * 60 * 1000,
        platformId: 'suirify_launchpad_demo',
        errorCode: 'FACE_MATCH_FAILED',
        faceMatchConfidence: 0.42,
        livenessConfidence: 0.98,
        rulesEngineResult: 'FAIL',
      },
      {
        id: 'fail_003',
        timestamp: now - 20 * 60 * 1000,
        platformId: 'suirify_launchpad_demo',
        errorCode: 'CONSENT_DENIED',
        rulesEngineResult: 'FAIL',
      },
    ],
    auditPackReady: true,
    generatedAt: now,
  });
});

app.get('/api/dashboard/regulator', (_req, res) => {
  const now = Date.now();
  return res.json({
    ecosystem: {
      totalVerifiedUsers: 48291,
      integratedPlatforms: 23,
      complianceRate: 0.917,
      fraudSignals: 47,
    },
    platformCompliance: [
      {
        platformId: 'fintech_alpha',
        verificationCount: 12030,
        complianceScore: 0.95,
        activeAttestations: 10984,
        expiredAttestations: 902,
        fraudSignals: 8,
      },
      {
        platformId: 'defi_beta',
        verificationCount: 9044,
        complianceScore: 0.9,
        activeAttestations: 7880,
        expiredAttestations: 1044,
        fraudSignals: 16,
      },
      {
        platformId: 'wallet_gamma',
        verificationCount: 6188,
        complianceScore: 0.93,
        activeAttestations: 5710,
        expiredAttestations: 390,
        fraudSignals: 5,
      },
    ],
    liveFraudSignals: [
      {
        id: 'signal_001',
        timestamp: now - 30 * 1000,
        platformId: 'defi_beta',
        signalType: 'deepfake_attempt',
        severity: 'high',
        confidence: 0.98,
      },
      {
        id: 'signal_002',
        timestamp: now - 90 * 1000,
        platformId: 'fintech_alpha',
        signalType: 'duplicate_nin',
        severity: 'medium',
        confidence: 0.88,
      },
      {
        id: 'signal_003',
        timestamp: now - 4 * 60 * 1000,
        platformId: 'wallet_gamma',
        signalType: 'consent_bypass',
        severity: 'low',
        confidence: 0.74,
      },
    ],
    expiringAlerts: [
      { platformId: 'fintech_alpha', expiringInDays: 7, count: 120 },
      { platformId: 'defi_beta', expiringInDays: 14, count: 92 },
      { platformId: 'wallet_gamma', expiringInDays: 30, count: 41 },
    ],
    frameworkSummary: {
      CBN_KYC_2023: 0.92,
      NDPA_2023: 0.97,
      NITDA_COP_2022: 0.94,
      SEC_2024: 0.9,
    },
    zeroPiiBadgeText: 'Zero PII | NDPA Compliant',
    generatedAt: now,
  });
});

app.post('/api/extension/analyze', (req, res) => {
  const { url, language } = req.body || {};
  const lang = String(language || 'EN').toUpperCase();
  const byLanguage = {
    EN: {
      summary:
        'This policy includes broad third-party sharing language and unclear retention timelines for personal data.',
      suirifyGap:
        'Policy does not clearly state biometric processing controls or explicit NDPA consent proof requirements.',
    },
    PIDGIN: {
      summary:
        'Dis policy fit share user data with third parties and e no clear talk how long dem go keep your personal data.',
      suirifyGap:
        'Dem never explain well how dem handle biometric data and consent proof under NDPA.',
    },
    YORUBA: {
      summary:
        'Ilana yi ni ipin data pelu awon egbe keta, ati pe ko salaye akoko ipamo data ni kedere.',
      suirifyGap:
        'Ko si alaye kedere lori bi won se n tọju data biometrics ati eri iforuko-inu NDPA.',
    },
  };

  const selected = byLanguage[lang] || byLanguage.EN;
  return res.json({
    url: url || 'https://example.com/privacy',
    riskScore: 71,
    summary: selected.summary,
    language: lang,
    flaggedClauses: [
      {
        id: 'clause_001',
        clauseTitle: 'Third-Party Data Sharing',
        excerpt: 'We may share user information with trusted partners for analytics, advertising, and operational services.',
        riskLevel: 'HIGH',
        ndpaReference: 'NDPA 2023 - Lawful Basis and Data Minimization',
        recommendation: 'Limit sharing to explicit consent scopes and list partner categories clearly.',
      },
      {
        id: 'clause_002',
        clauseTitle: 'Retention Period',
        excerpt: 'We retain data as long as needed to provide services and for business purposes.',
        riskLevel: 'MEDIUM',
        ndpaReference: 'NDPA 2023 - Storage Limitation',
        recommendation: 'Add fixed retention windows and deletion timelines for each data category.',
      },
    ],
    suirifyGap: selected.suirifyGap,
    poweredBy: 'Microsoft Azure',
    analyzedAt: Date.now(),
  });
});

/**
 * Provide mint configuration so the frontend can construct mint requests client-side.
 */
app.get('/mint-config', async (_req, res) => {
  let disabledReason = null;

  if (!hasSuiRpcSupport()) {
    disabledReason = 'Sui client is not configured on the server.';
  }

  if (!disabledReason) {
    const missingIds = [];
    if (!PACKAGE_ID) missingIds.push('PACKAGE_ID');
    if (!ATTESTATION_REGISTRY_ID) missingIds.push('ATTESTATION_REGISTRY_ID');
    if (!ADMIN_CAP_ID || !PROTOCOL_CONFIG_ID) missingIds.push('protocol admin objects');
    if (missingIds.length) {
      disabledReason = `Protocol configuration missing: ${missingIds.join(', ')}.`;
    }
  }

  if (!disabledReason) {
    try {
      const packageExists = await withSuiClient('mint-config.package-check', async (client) => {
        if (!client?.core || typeof client.core.getObjects !== 'function') return false;
        const response = await client.core.getObjects({ objectIds: [PACKAGE_ID] });
        return Boolean(response?.objects?.[0]);
      });
      if (!packageExists) {
        throw new Error('Package object not found by gRPC client.');
      }
    } catch (err) {
      const raw = err && err.message ? err.message : String(err);
      console.warn('Protocol package lookup failed:', raw);
      disabledReason = `Protocol package unavailable on the selected network. ${raw}`;
    }
  }

  if (disabledReason) {
    return res.json({
      success: true,
      packageId: PACKAGE_ID || null,
      protocolConfigId: PROTOCOL_CONFIG_ID || null,
      attestationRegistryId: ATTESTATION_REGISTRY_ID || null,
      defaultPolicyId: JURISDICTION_POLICY_ID || null,
      mintFee: null,
      mintFeeMist: null,
      mintFeeSui: null,
      mintFeeSource: null,
      contractVersion: null,
      treasuryAddress: null,
      mintingDisabled: true,
      disabledReason,
    });
  }

  let mintFeeMist = STATIC_MINT_FEE ? String(STATIC_MINT_FEE) : null;
  let contractVersion = null;
  let treasuryAddress = null;
  let mintFeeSource = mintFeeMist ? 'env' : null;
  let chainMintFee = null;

  if (PROTOCOL_CONFIG_ID) {
    try {
      const configObject = await fetchGraphQLObject(PROTOCOL_CONFIG_ID);
      const fields = getMoveObjectFields(configObject);
      if (fields) {
        if (fields.mint_fee !== undefined && fields.mint_fee !== null) {
          chainMintFee = toBigIntOrNull(fields.mint_fee);
          if (chainMintFee !== null) {
            mintFeeMist = chainMintFee.toString();
            mintFeeSource = 'on-chain';
          }
        }
        if (fields.contract_version !== undefined) {
          contractVersion = Number(fields.contract_version);
        }
        if (fields.treasury_address) {
          treasuryAddress = fields.treasury_address;
        }
      }
    } catch (err) {
      console.warn('Unable to fetch ProtocolConfig on-chain:', err && err.message ? err.message : err);
    }
  }

  const envMintFee = toBigIntOrNull(STATIC_MINT_FEE);
  if (!mintFeeMist && envMintFee !== null) {
    mintFeeMist = envMintFee.toString();
    mintFeeSource = 'env';
  }

  if (chainMintFee !== null && envMintFee !== null && chainMintFee !== envMintFee) {
    console.error('Mint fee mismatch between on-chain ProtocolConfig and backend .env value.', {
      onChain: chainMintFee.toString(),
      env: envMintFee.toString(),
    });
    return res.status(500).json({
      error: 'Mint fee configuration mismatch between on-chain protocol config and server environment.',
      details: {
        onChain: chainMintFee.toString(),
        env: envMintFee.toString(),
      },
    });
  }

  const mintFeeSui = mintFeeMist ? formatSuiFromMist(mintFeeMist) : null;

  res.json({
    success: true,
    packageId: PACKAGE_ID,
    protocolConfigId: PROTOCOL_CONFIG_ID || null,
    attestationRegistryId: ATTESTATION_REGISTRY_ID,
    defaultPolicyId: JURISDICTION_POLICY_ID || null,
    mintFee: mintFeeMist,
    mintFeeMist,
    mintFeeSui,
    mintFeeSource,
    contractVersion,
    treasuryAddress,
    mintingDisabled: false,
    disabledReason: null,
  });
});

/**
 * Check for an existing, unconsumed mint request for the given wallet address.
 * Returns the most recent MintRequestCreated event (if any) that matches the wallet
 * and has not yet been finalised by this server instance.
 */
app.get('/mint-request/:walletAddress', async (req, res) => {
  if (!hasSuiRpcSupport()) {
    return res.status(500).json({ success: false, error: 'Sui client is not configured on the server.' });
  }

  if (!PACKAGE_ID) {
    return res.status(500).json({ success: false, error: 'PACKAGE_ID not configured on the server.' });
  }

  const { walletAddress } = req.params || {};
  const preferredRequestId = typeof req.query.requestId === 'string' ? req.query.requestId : null;
  if (!walletAddress) {
    return res.status(400).json({ success: false, error: 'walletAddress is required.' });
  }

  try {
  const pending = await getLatestPendingMintRequest(walletAddress, 50, preferredRequestId);
    if (pending) {
      return res.json({ success: true, hasRequest: true, ...pending });
    }

    res.json({ success: true, hasRequest: false });
  } catch (error) {
    console.error('Failed to lookup existing mint request:', error);
    res.status(500).json({ success: false, error: 'Failed to lookup mint request.' });
  }
});

/**
 * Admin endpoint: list recent mint requests, optionally filtered by wallet.
 */
app.get('/admin/mint-requests', requireAdmin, async (req, res) => {
  if (!hasSuiRpcSupport()) {
    return res.status(500).json({ success: false, error: 'Sui client is not configured on the server.' });
  }
  if (!PACKAGE_ID) {
    return res.status(500).json({ success: false, error: 'PACKAGE_ID not configured on the server.' });
  }

  const walletAddress = typeof req.query.walletAddress === 'string' ? req.query.walletAddress.trim() : null;
  const includeConsumed = String(req.query.includeConsumed || 'false').toLowerCase() === 'true';
  const limitRaw = typeof req.query.limit === 'string' ? parseInt(req.query.limit, 10) : null;
  const limit = Math.min(Math.max(limitRaw || 50, 1), 200);
  let cursorParam;
  if (typeof req.query.cursor === 'string' && req.query.cursor.length) {
    const eventSeqParam = typeof req.query.eventSeq === 'string' && req.query.eventSeq.length ? req.query.eventSeq : null;
    cursorParam = eventSeqParam ? { txDigest: req.query.cursor, eventSeq: eventSeqParam } : { txDigest: req.query.cursor };
  }

  let query;
  if (walletAddress) {
    query = {
      All: [
        { MoveEventType: `${PACKAGE_ID}::protocol::MintRequestCreated` },
        { SenderAddress: walletAddress },
      ],
    };
  } else {
    query = { MoveEventType: `${PACKAGE_ID}::protocol::MintRequestCreated` };
  }

  try {
    const response = await queryGraphQL(EVENT_QUERY, {
      type: `${PACKAGE_ID}::protocol::MintRequestCreated`,
      first: limit,
      after: null,
    });
    const events = Array.isArray(response?.data?.events?.nodes) ? response.data.events.nodes : [];
    const items = [];

    for (const event of events) {
      const parsed = event?.contents?.json || {};
      const requestId = parsed.request_id || parsed.requestId || null;
      const requester = parsed.requester || parsed.requester_address || null;
      const txDigest = event?.transaction?.digest || event?.transactionDigest || event?.digest || null;
      const eventSeq = event?.sequenceNumber !== undefined ? event.sequenceNumber : null;
      const timestampMs = event?.timestamp || null;
      const consumed = requestId ? isRequestConsumed(requestId) : false;

      if (!includeConsumed && consumed) {
        continue;
      }

      const stored = requestId && typeof db.getConsumedMintRequest === 'function'
        ? db.getConsumedMintRequest(requestId.toLowerCase())
        : null;

      items.push({
        requestId,
        requester,
        txDigest,
        eventSeq,
        timestampMs,
        isConsumed: consumed,
        stored,
      });
    }

    res.json({
      success: true,
      items,
      nextCursor: response?.data?.events?.pageInfo?.endCursor || null,
    });
  } catch (error) {
    console.error('Admin mint request listing failed:', error);
    res.status(500).json({ success: false, error: 'Failed to list mint requests.' });
  }
});

/**
 * Admin endpoint: manually mark a mint request as consumed to prevent reuse.
 */
app.post('/admin/mint-request/consume', requireAdmin, (req, res) => {
  const { requestId, note } = req.body || {};
  if (!requestId || typeof requestId !== 'string') {
    return res.status(400).json({ success: false, error: 'requestId is required.' });
  }

  markRequestConsumed(requestId, { note: note || null, source: 'manual-admin', eventType: 'admin-force-consume' });

  res.json({
    success: true,
    requestId: requestId.toLowerCase(),
  });
});

/**
 * Finalize attestation minting after a user has created a mint request on-chain.
 */
app.post('/finalize-mint', async (req, res) => {
  const { sessionId, requestId: rawRequestId, requestTxDigest } = req.body || {};

  if (!sessionId) {
    return res.status(400).json({ error: 'sessionId is required.' });
  }

  let requestId = typeof rawRequestId === 'string' && rawRequestId.trim().length ? rawRequestId.trim() : null;
  let requestDigestInput = typeof requestTxDigest === 'string' && requestTxDigest.trim().length ? requestTxDigest.trim() : null;

  if (!hasSuiRpcSupport()) {
    return res.status(500).json({ error: 'Sui client is not configured on the server.' });
  }

  if (!adminKeypair) {
    return res.status(500).json({ error: 'Admin signer is not configured on the server.' });
  }

  if (!TransactionBlock || typeof TransactionBlock !== 'function') {
    return res.status(500).json({ error: 'Sui transaction builder not available on the server.' });
  }

  if (!ADMIN_CAP_ID || !PROTOCOL_CONFIG_ID || !ATTESTATION_REGISTRY_ID) {
    return res.status(500).json({ error: 'Protocol objects (admin cap, config, registry) are not fully configured.' });
  }

  const sessionData = verificationSessionStore.get(sessionId);
  if (!sessionData || !sessionData.preparedData) {
    return res.status(404).json({ error: 'Verification session not found or incomplete.' });
  }

  const { preparedData, country, idNumber, policyId: sessionPolicyId } = sessionData;
  const policyObjectId = sessionPolicyId || JURISDICTION_POLICY_ID;
  if (!policyObjectId) {
    return res.status(500).json({ error: 'Jurisdiction policy not configured for this session.' });
  }

  const auditNameHash = sessionData?.govRecord?.fullName ? hashFullNameForStorage(sessionData.govRecord.fullName) : null;

  const {
    userWalletAddress,
    jurisdictionCode,
    verifierSource,
    verificationLevel,
    nameHash,
    isHumanVerified,
    isOver18,
    verifierVersion,
    extraVerifierSources = [],
  } = preparedData;

  try {
    const pending = await getLatestPendingMintRequest(userWalletAddress, 50, requestId);
    if (pending) {
      if (!requestId || pending.requestId.toLowerCase() !== requestId.toLowerCase()) {
        console.log(`Finalizing mint using request ${pending.requestId} for wallet ${userWalletAddress} (was ${requestId || 'auto-detected'}).`);
      }
      requestId = pending.requestId;
      if (!requestDigestInput) {
        requestDigestInput = pending.requestTxDigest || null;
      }
    } else if (requestId) {
      if (isRequestConsumed(requestId)) {
        const existingAttestation = await getExistingAttestation(userWalletAddress);
        if (existingAttestation) {
          return res.status(409).json({
            error: 'Wallet already holds an attestation.',
            attestation: existingAttestation,
          });
        }
      }
      const fallback = await getLatestPendingMintRequest(userWalletAddress, 50, null);
      if (fallback) {
        console.log(`Requested mint id ${requestId} not pending, falling back to ${fallback.requestId} for wallet ${userWalletAddress}.`);
        requestId = fallback.requestId;
        if (!requestDigestInput) {
          requestDigestInput = fallback.requestTxDigest || null;
        }
      }
    }
  } catch (pendingErr) {
    console.error('Failed to resolve pending mint request:', pendingErr);
  }

  if (!requestId) {
    return res.status(409).json({ error: 'No pending mint request found for this wallet. Please create a mint request first.' });
  }

  if (isRequestConsumed(requestId)) {
    return res.status(409).json({ error: 'Mint request has already been processed.' });
  }

  const existingAttestation = await getExistingAttestation(userWalletAddress);
  if (existingAttestation) {
    markRequestConsumed(requestId, {
      note: 'Detected existing attestation prior to finalization',
      walletAddress: userWalletAddress,
      eventType: 'existing-attestation',
      source: 'finalize-handler',
      attestationId: existingAttestation.objectId,
      status: existingAttestation.status || null,
      statusCode: existingAttestation.statusCode ?? null,
      statusLabel: existingAttestation.statusLabel || null,
      jurisdictionCode: existingAttestation.jurisdictionCode ?? null,
      verificationLevel: existingAttestation.verificationLevel ?? null,
      issueDateMs: existingAttestation.issueDateMs ?? null,
      expiryDateMs: existingAttestation.expiryDateMs ?? null,
    });
    db.markUsedGovId(
      country,
      idNumber,
      Object.assign(
        {
          walletAddress: userWalletAddress,
          attestationId: existingAttestation.objectId,
          requestId: requestId || null,
          detectedAt: new Date().toISOString(),
          eventType: 'existing-attestation',
          source: 'finalize-handler',
          requestedRequestId: rawRequestId || null,
          requestTxDigest: requestDigestInput || null,
          status: existingAttestation.status || null,
          statusCode: existingAttestation.statusCode ?? null,
          statusLabel: existingAttestation.statusLabel || null,
          jurisdictionCode: existingAttestation.jurisdictionCode ?? null,
          verificationLevel: existingAttestation.verificationLevel ?? null,
          issueDateMs: existingAttestation.issueDateMs ?? null,
          expiryDateMs: existingAttestation.expiryDateMs ?? null,
        },
        auditNameHash ? { fullNameHash: auditNameHash } : {}
      )
    );
    verificationSessionStore.delete(sessionId);
    return res.status(409).json({ error: 'Wallet already holds an attestation.', attestation: existingAttestation });
  }

  if (!nameHash || !(nameHash instanceof Uint8Array) || nameHash.length !== 32) {
    return res.status(500).json({ error: 'Invalid name hash stored for this session.' });
  }

  try {
    const txb = new TransactionBlock();
    const adminAddress = adminKeypair.getPublicKey().toSuiAddress();

    const nameHashVector = typeof txb.pure.vector === 'function'
      ? txb.pure.vector('u8', Array.from(nameHash))
      : txb.pure(Array.from(nameHash));

    const extraSourcesArray = Array.isArray(extraVerifierSources)
      ? extraVerifierSources.map((value) => Number(value) || 0)
      : [];
    const extraSourcesVector = typeof txb.pure.vector === 'function'
      ? txb.pure.vector('u8', extraSourcesArray)
      : txb.pure(extraSourcesArray);

    const requestIdArg = typeof txb.pure.id === 'function'
      ? txb.pure.id(requestId)
      : txb.pure.address(requestId);

    txb.moveCall({
      target: `${PACKAGE_ID}::protocol::mint_attestation`,
      arguments: [
        txb.object(ADMIN_CAP_ID),
        txb.object(PROTOCOL_CONFIG_ID),
        txb.object(ATTESTATION_REGISTRY_ID),
        requestIdArg,
        txb.object(policyObjectId),
        txb.pure.address(userWalletAddress),
        txb.pure.u16(Number(jurisdictionCode)),
        txb.pure.u8(Number(verifierSource)),
        extraSourcesVector,
        txb.pure.u8(Number(verificationLevel)),
        nameHashVector,
        txb.pure.bool(Boolean(isHumanVerified)),
        txb.pure.bool(Boolean(isOver18)),
        txb.pure.u8(Number(verifierVersion)),
      ],
    });

    txb.setSender(adminAddress);
    txb.setGasBudget(50_000_000);

    const executionResult = await withSuiClient('mint.finalize', async (client) => {
      const txBytes = await txb.build({ client: client.core || client });
      const signature = await signTransactionWithKeypair(adminKeypair, txBytes);
      return client.core.executeTransaction({
        transaction: txBytes,
        signatures: [signature],
      });
    });

    const digest = executionResult?.transaction?.digest || executionResult?.transaction?.effects?.transactionDigest || null;
    const attestationSummary = await extractAttestationFromChanges(executionResult?.transaction?.effects?.changedObjects || []);
    const attestationObjectId = attestationSummary?.objectId || null;

    // CRITICAL FIX: Persist attestation immediately after on-chain execution.
    // This ensures attestations are in the DB even if event indexer fails.
    // Mark as "pending_confirmation" until event indexer validates.
    try {
      if (attestationObjectId) {
        db.recordAttestationMinted(attestationObjectId, {
          walletAddress: userWalletAddress,
          requestId,
          finalizeDigest: digest,
          recordedAt: new Date().toISOString(),
          eventType: 'mint-finalized',
          source: 'finalize-handler',
          status: 'pending_confirmation',
          statusCode: attestationSummary?.statusCode ?? null,
          statusLabel: attestationSummary?.statusLabel || null,
          jurisdictionCode: attestationSummary?.jurisdictionCode ?? null,
          verificationLevel: attestationSummary?.verificationLevel ?? null,
          issueDateMs: attestationSummary?.issueDateMs ?? null,
          expiryDateMs: attestationSummary?.expiryDateMs ?? null,
        });
      }
    } catch (recordErr) {
      console.error('Failed to record attestation immediately after mint:', recordErr);
    }

    if (requestId && typeof requestId === 'string') {
      markRequestConsumed(requestId, {
        finalizedAt: new Date().toISOString(),
        finalizeDigest: digest,
        walletAddress: userWalletAddress,
        eventType: 'mint-finalized',
        source: 'finalize-handler',
        requestTxDigest: requestDigestInput || null,
        requestedRequestId: rawRequestId || null,
        attestationId: attestationObjectId,
        status: attestationSummary?.status || null,
        statusCode: attestationSummary?.statusCode ?? null,
        statusLabel: attestationSummary?.statusLabel || null,
        jurisdictionCode: attestationSummary?.jurisdictionCode ?? null,
        verificationLevel: attestationSummary?.verificationLevel ?? null,
        issueDateMs: attestationSummary?.issueDateMs ?? null,
        expiryDateMs: attestationSummary?.expiryDateMs ?? null,
      });
    }

    pendingMints.set(
      userWalletAddress,
      Object.assign(
        {
          country,
          idNumber,
          requestId,
          requestedRequestId: rawRequestId || null,
          attestationId: attestationObjectId,
          attestationSummary,
        },
        auditNameHash ? { fullNameHash: auditNameHash } : {}
      )
    );
    try {
      db.markUsedGovId(
        country,
        idNumber,
        Object.assign(
          {
            walletAddress: userWalletAddress,
            requestId,
            finalizeDigest: digest,
            recordedAt: new Date().toISOString(),
            eventType: 'mint-finalized',
            source: 'finalize-handler',
            requestTxDigest: requestDigestInput || null,
            requestedRequestId: rawRequestId || null,
            attestationId: attestationObjectId,
            status: attestationSummary?.status || null,
            statusCode: attestationSummary?.statusCode ?? null,
            statusLabel: attestationSummary?.statusLabel || null,
            jurisdictionCode: attestationSummary?.jurisdictionCode ?? null,
            verificationLevel: attestationSummary?.verificationLevel ?? null,
            issueDateMs: attestationSummary?.issueDateMs ?? null,
            expiryDateMs: attestationSummary?.expiryDateMs ?? null,
          },
          auditNameHash ? { fullNameHash: auditNameHash } : {}
        )
      );
    } catch (markErr) {
      console.error('Failed to persist mint completion metadata:', markErr);
    }
    verificationSessionStore.delete(sessionId);

    res.json({
      success: true,
      digest,
      finalizeTxDigest: digest,
      requestTxDigest: requestDigestInput || null,
      attestationId: attestationObjectId,
      effects: executionResult?.effects ?? null,
      objectChanges: executionResult?.transaction?.effects?.changedObjects ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Failed to finalize mint:', message);
    res.status(500).json({ success: false, error: 'Failed to finalize mint transaction.', details: message });
  }
});

/**
 * Event Indexer for final, permanent storage.
 */
async function startIndexer() {
  if (!hasSuiRpcSupport()) {
    console.warn('Cannot start indexer: Sui client not configured.');
    return;
  }
  if (!SUI_GRAPHQL_CANDIDATES.length) {
    console.warn('Indexer disabled: GraphQL endpoint not configured.');
    return;
  }
  console.log('Starting event indexer...');
  try {
    try {
      const warmupEndpoint = SUI_GRAPHQL_CANDIDATES[0];
      const warmupRes = await fetch(warmupEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-sui-rpc-version': '1',
        },
        body: JSON.stringify({ query: '{ chainIdentifier }' }),
      });

      if (!warmupRes.ok) {
        throw new Error(`HTTP ${warmupRes.status}`);
      }

      const warmupData = await warmupRes.json();
      if (warmupData?.errors?.length) {
        throw new Error(warmupData.errors.map((err) => err?.message || String(err)).join('; '));
      }

      console.log(`GraphQL reachable, chain=${warmupData?.data?.chainIdentifier || 'unknown'}`);
    } catch (warmupErr) {
      console.warn('Indexer disabled: GraphQL is unreachable:', warmupErr && warmupErr.message ? warmupErr.message : warmupErr);
      return;
    }

    const pollIndexer = async () => {
      try {
        const response = await queryGraphQL(EVENT_QUERY, {
          type: `${PACKAGE_ID}::protocol::AttestationMinted`,
          first: 50,
          after: attestationIndexerCursor,
        });

        const eventPage = response?.data?.events || null;
        const events = Array.isArray(eventPage?.nodes) ? eventPage.nodes : [];
        attestationIndexerCursor = eventPage?.pageInfo?.endCursor || attestationIndexerCursor;

        for (const event of events) {
          const payload = event?.contents?.json || {};
          const recipient = payload.recipient || payload.walletAddress || null;
          const requestIdFromEvent = payload.request_id || payload.requestId || null;
          const attestationObjectIdFromEvent = payload.objectId || payload.attestationId || null;

          if (requestIdFromEvent) {
            markRequestConsumed(requestIdFromEvent, {
              finalizedAt: new Date().toISOString(),
              source: 'event-indexer',
              attestationId: attestationObjectIdFromEvent || null,
              status: 'ACTIVE',
              statusCode: STATUS_CODE_ACTIVE,
              statusLabel: 'Active',
              eventType: 'indexer-attestation',
              walletAddress: recipient || null,
              recipient,
            });
          }

          if (!recipient) continue;

          const pendingMint = pendingMints.get(recipient);
          if (!pendingMint) continue;

          let attSummary = pendingMint.attestationSummary;
          if (!attSummary && attestationObjectIdFromEvent) {
            try {
              attSummary = await getExistingAttestation(recipient);
            } catch (summaryErr) {
              console.error('Indexer failed to load attestation summary:', summaryErr);
            }
          }

          const attestationIdFromSummary = attSummary?.objectId || pendingMint.attestationId || attestationObjectIdFromEvent || null;
          try {
            const record = db.markUsedGovId(
              pendingMint.country,
              pendingMint.idNumber,
              Object.assign(
                {
                  walletAddress: recipient,
                  eventType: 'indexer-attestation',
                  source: 'event-indexer',
                  indexedAt: new Date().toISOString(),
                  requestId: pendingMint.requestId || null,
                  requestedRequestId: pendingMint.requestedRequestId || null,
                  attestationId: attestationIdFromSummary,
                  status: attSummary?.status || 'ACTIVE',
                  statusCode: attSummary?.statusCode ?? STATUS_CODE_ACTIVE,
                  statusLabel: attSummary?.statusLabel || 'Active',
                  jurisdictionCode: attSummary?.jurisdictionCode ?? null,
                  verificationLevel: attSummary?.verificationLevel ?? null,
                  issueDateMs: attSummary?.issueDateMs ?? null,
                  expiryDateMs: attSummary?.expiryDateMs ?? null,
                },
                pendingMint.fullNameHash ? { fullNameHash: pendingMint.fullNameHash } : {}
              )
            );
            if (record && record.idHash) {
              console.log(`✅ SUCCESS: Indexed attestation for wallet ${recipient} (country=${pendingMint.country}, idHash=${record.idHash.slice(0, 12)}…).`);
            } else {
              console.log(`✅ SUCCESS: Indexed attestation for wallet ${recipient} (country=${pendingMint.country}).`);
            }
          } catch (e) {
            console.error('Failed to mark gov id as used in persistent DB:', e);
          }
          pendingMints.delete(recipient);
        }
      } catch (err) {
        console.error('Indexer polling failed:', err && err.message ? err.message : err);
      }
    };

    await pollIndexer();
    setInterval(pollIndexer, 15000);
    console.log('Indexer polling started using GraphQL events.');
  } catch (error) {
    console.error('Failed to start event indexer:', error);
  }
}

// Global process-level handlers to prevent the process from exiting unexpectedly
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception — keeping process alive:', err && err.stack ? err.stack : err);
  // optionally perform cleanup or alerting here
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // do not exit — log and keep running for debugging in dev
});

// previous: server = app.listen(PORT, () => { ... });
// Replace with resilient start logic that retries on EADDRINUSE

let server = null;
const START_PORT = PORT;
const PORT_LOCKED = Boolean(process.env.PORT);
const MAX_RETRIES = PORT_LOCKED ? 0 : 10;

function getLanAddresses(port) {
  const result = [];
  const nets = os.networkInterfaces();
  Object.values(nets).forEach((entries) => {
    if (!entries) return;
    entries.forEach((entry) => {
      if (!entry || entry.internal) return;
      if (entry.family === 'IPv4') {
        result.push(`http://${entry.address}:${port}`);
      }
    });
  });
  return Array.from(new Set(result));
}

function startServer(port = START_PORT, attempts = 0) {
  if (attempts > MAX_RETRIES) {
    console.error(`Failed to bind server after ${MAX_RETRIES} retries. Exiting.`);
    process.exit(1);
  }

  try {
    server = app.listen(port, HOST, () => {
      console.log(`Server listening on http://${HOST}:${port}`);
      console.log(`Health: http://localhost:${port}/health`);
      const lanUrls = getLanAddresses(port);
      if (lanUrls.length) {
        console.log('LAN access:');
        lanUrls.forEach((url) => console.log(`  → ${url}`));
      } else {
        console.log('No LAN IPv4 addresses detected; ensure your network interfaces are active.');
      }
      // start indexer only once, and only if sui client configured
      try {
        startIndexer();
      } catch (e) {
        console.error('Error starting indexer:', e);
      }
    });

    server.on('error', (err) => {
      if (err && err.code === 'EADDRINUSE') {
        if (PORT_LOCKED) {
          console.error(`Port ${port} is assigned via environment and already in use. Exiting.`);
          process.exit(1);
        }
        console.warn(`Port ${port} already in use. Trying port ${port + 1} ...`);
        // give a short delay then try next port
        setTimeout(() => startServer(port + 1, attempts + 1), 200);
      } else {
        console.error('HTTP server error:', err);
      }
    });
  } catch (err) {
    if (err && err.code === 'EADDRINUSE') {
      if (PORT_LOCKED) {
        console.error(`Port ${port} is assigned via environment and already in use. Exiting.`);
        process.exit(1);
      }
      console.warn(`Port ${port} already in use. Trying port ${port + 1} ...`);
      setTimeout(() => startServer(port + 1, attempts + 1), 200);
    } else {
      console.error('Failed to start server:', err);
      process.exit(1);
    }
  }
}

// start the server with retries
startServer();

/**
 * helper: decode data URL to Buffer
 */
function decodeDataUrl(dataUrl) {
  const m = String(dataUrl).match(/^data:.+;base64,(.+)$/);
  if (!m) return null;
  return Buffer.from(m[1], 'base64');
}

async function resolvePhotoReference(photoRef) {
  if (!photoRef || typeof photoRef !== 'string') return null;
  if (photoRef.startsWith('data:')) return photoRef;
  if (/^https?:\/\//i.test(photoRef)) return photoRef; // allow frontend to fetch remote URL directly

  const normalized = photoRef.replace(/^\//, '');
  const candidatePaths = [];

  if (path.isAbsolute(photoRef) && fs.existsSync(photoRef)) {
    candidatePaths.push(photoRef);
  }

  candidatePaths.push(path.join(__dirname, normalized));
  candidatePaths.push(path.join(__dirname, 'reference_photos', path.basename(photoRef)));

  for (const filePath of candidatePaths) {
    try {
      if (!filePath || !fs.existsSync(filePath)) continue;
      const data = await fs.promises.readFile(filePath);
      const ext = path.extname(filePath).slice(1).toLowerCase() || 'jpeg';
      return `data:image/${ext};base64,${data.toString('base64')}`;
    } catch (err) {
      console.warn('Failed to load reference photo from', filePath, err?.message || err);
    }
  }

  return null;
}

// add missing core requires used later
const fs = require('fs');
const path = require('path');

// POST /face-verify


// ==========================================
// AZURE FACE API: LIVENESS WITH VERIFY
// ==========================================
const AZURE_FACE_ENDPOINT = (process.env.AZURE_FACE_ENDPOINT || 'https://surifyliveness.cognitiveservices.azure.com').replace(/\/$/, '');
const AZURE_FACE_KEY = process.env.AZURE_FACE_KEY || ''; 

app.post('/azure-face-verify', async (req, res) => {
  console.log(`\n\n=== [ROUTE HIT] /azure-face-verify called for session: ${req.body?.sessionId || 'UNKNOWN'} ===`);
  try {
    const { sessionId, livePhoto } = req.body;
    if (!sessionId || !livePhoto) return res.status(400).json({ success: false, error: 'sessionId and livePhoto are required' });

    const sessionData = verificationSessionStore.get(sessionId);
    if (!sessionData || !sessionData.govRecord) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    // FORCE BYPASS NO MATTER WHAT
    console.log("[MOCK LIVENESS] Forcing bypass approval.");
    sessionData.faceVerification = {
      match: true,
      similarity: 1,
      diffPercent: 0,
      bypassed: true,
      checkedAt: new Date().toISOString(),
    };
    verificationSessionStore.set(sessionId, sessionData);
    return res.json({ success: true, match: true, similarity: 1, diffPercent: 0, decision: 'realface', bypassed: true });

    /* --- OLD AZURE CODE COMMENTED OUT ---
    if (BYPASS_FACE_MATCH) {
      sessionData.faceVerification = {
        match: true,
        similarity: 1,
        diffPercent: 0,
        bypassed: true,
        checkedAt: new Date().toISOString(),
      };
      verificationSessionStore.set(sessionId, sessionData);
      return res.json({ success: true, match: true, similarity: 1, diffPercent: 0, decision: 'realface', bypassed: true });
    }

    if (!AZURE_FACE_KEY || !AZURE_FACE_ENDPOINT) {
      return res.status(503).json({ success: false, error: 'Azure Face API credentials not configured.' });
    }
    ...
    */

    // Get the reference image from DB
    const photoUrl = await resolvePhotoReference(sessionData.govRecord.photoReference);
    if (!photoUrl) return res.status(404).json({ success: false, error: 'Ref photo not found.' });
    
    // Quick helper to convert base64/url to Buffer
    const getBuffer = async (src) => {
      if (src.startsWith('data:')) return Buffer.from(src.split(",")[1], 'base64');
      const r = await fetch(src);
      if (!r.ok) throw new Error("HTTP " + r.status);
      return Buffer.from(await r.arrayBuffer());
    };

    const refBuffer = await getBuffer(photoUrl);
    const liveBuffer = await getBuffer(livePhoto);

    // Helper: Detect Face -> faceId
    const detectFace = async (imgBuffer, label) => {
      console.log(`[Azure Vision] -> Sending ${label} image to Azure (${(imgBuffer.length / 1024).toFixed(2)} KB)...`);
      const url = `${AZURE_FACE_ENDPOINT}/face/v1.0/detect?returnFaceId=true&recognitionModel=recognition_04&detectionModel=detection_03`;
      const r = await fetch(url, {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': AZURE_FACE_KEY,
          'Content-Type': 'application/octet-stream'
        },
        body: imgBuffer
      });
      if (!r.ok) {
        const errText = await r.text();
        console.error(`[Azure Vision Error on ${label}]:`, errText);
        throw new Error(errText);
      }
      const data = await r.json();
      if (!data || data.length === 0) {
        console.log(`[Azure Vision] -> No face detected in ${label} image!`);
        return null;
      }
      console.log(`[Azure Vision] -> Detected faceId for ${label}: ${data[0].faceId}`);
      return data[0].faceId;
    };

    console.log(`[Azure Vision] Phase 1/2: Submitting images to Azure for session ${sessionId}...`);
    const liveFaceId = await detectFace(liveBuffer, "Live Webcam");
    const refFaceId = await detectFace(refBuffer, "Database Reference");

    if (!liveFaceId) return res.json({ success: false, message: 'No face detected in the live camera feed.' });
    if (!refFaceId) return res.json({ success: false, message: 'No face detected in the government ID document.' });

    // Verify the two faces
    /*
    const verifyUrl = `${AZURE_FACE_ENDPOINT}/face/v1.0/verify`;
    const vRes = await fetch(verifyUrl, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': AZURE_FACE_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ faceId1: liveFaceId, faceId2: refFaceId })
    });
    
    if (!vRes.ok) throw new Error(await vRes.text());
    const vData = await vRes.json();

    const isIdentical = vData.isIdentical;
    const matchConfidence = vData.confidence;
    console.log(`[Azure Vision] Verify Result: isIdentical=${isIdentical}, confidence=${matchConfidence}`);

    if (isIdentical || matchConfidence >= 0.5) {
      console.log(`[Azure Vision] ✅ SUCCESS for session ${sessionId}`);
      sessionData.faceVerification = { match: true, similarity: matchConfidence, provider: 'azure_vision' };
      verificationSessionStore.set(sessionId, sessionData);
      return res.json({ success: true, decision: 'realface', message: 'Identity match passes via Azure Vision.' });
    } else {
      console.warn(`[Azure Vision] ❌ FAILED. Face mismatch.`);
      return res.json({ success: false, decision: 'rejected', message: 'Face does not match the ID document on record.' });
    }
    */
  } catch (error) {
    const errorMsg = error.stack || error.toString();
    console.error('[Verification Error] Azure Face API threw an exception:', errorMsg);
    res.status(500).json({ success: false, error: `Azure Vision Error: ${error.message || error}` });
  }
});
// ==========================================

app.post('/face-verify', async (req, res) => {
  console.log(`\n\n=== [ROUTE HIT] /face-verify called for session: ${req.body?.sessionId || 'UNKNOWN'} (WARNING: OLD ROUTE HIT) ===`);
  const { sessionId, livePhoto } = req.body || {};
  if (!sessionId) return res.status(400).json({ success: false, error: 'sessionId is required' });

  const sessionData = verificationSessionStore.get(sessionId);
  if (!sessionData || !sessionData.govRecord) return res.status(404).json({ success: false, error: 'Verification session not found or invalid' });

  const shouldBypassFaceMatch = BYPASS_FACE_MATCH;

  if (shouldBypassFaceMatch) {
    sessionData.faceVerification = {
      match: true,
      similarity: 1,
      diffPercent: 0,
      bypassed: true,
      checkedAt: new Date().toISOString(),
    };
    verificationSessionStore.set(sessionId, sessionData);
    return res.json({ success: true, match: true, similarity: 1, diffPercent: 0, bypassed: true });
  }

  if (!livePhoto) return res.status(400).json({ success: false, error: 'livePhoto is required when camera capture is enabled' });

  try {
    // reference photo may be a data URL, a local path, or a remote URL
    const ref = sessionData.govRecord.photoReference;
    if (!ref) return res.status(404).json({ success: false, error: 'No reference photo available for this record' });

    let imgRef;
    // remote URL: let Jimp read it directly
    if (typeof ref === 'string' && /^https?:\/\//i.test(ref)) {
      imgRef = await Jimp.read(ref);
    } else if (String(ref).startsWith('data:')) {
      const refBuffer = decodeDataUrl(ref);
      if (!refBuffer) return res.status(422).json({ success: false, error: 'Failed to decode reference photo data URL' });
      imgRef = await Jimp.read(refBuffer);
    } else {
      // treat as local file path (relative)
      const possiblePath = path.join(__dirname, ref.replace(/^\//, ''));
      let buf = null;
      if (fs.existsSync(possiblePath)) {
        buf = fs.readFileSync(possiblePath);
        imgRef = await Jimp.read(buf);
      } else {
        // fallback to reference_photos folder
        const fallback = path.join(__dirname, 'reference_photos', path.basename(ref));
        if (fs.existsSync(fallback)) {
          buf = fs.readFileSync(fallback);
          imgRef = await Jimp.read(buf);
        } else {
          return res.status(404).json({ success: false, error: 'Reference photo file not found' });
        }
      }
    }

    // decode live photo (expects data URL from client)
    const liveBuffer = decodeDataUrl(livePhoto);
    if (!liveBuffer) return res.status(422).json({ success: false, error: 'Failed to decode live photo' });
    const imgLive = await Jimp.read(liveBuffer);

    // normalize sizes for fair comparison
    const W = 256;
    const H = 256;

    const resizeImage = (image) => {
      if (!image || typeof image.resize !== 'function') {
        return image;
      }
      const sizeSpec = { w: W, h: H };
      try {
        const result = image.resize(sizeSpec);
        if (result) return result;
      } catch (errPrimary) {
        try {
          const result = image.resize(W, H);
          if (result) return result;
        } catch (errLegacy) {
          console.error('Failed to resize image with Jimp API variants:', errLegacy && errLegacy.message ? errLegacy.message : errLegacy);
          throw errLegacy;
        }
      }
      return image;
    };

    resizeImage(imgRef);
    resizeImage(imgLive);

    // perceptual distance 0..1 (lower = more similar), diff.percent 0..1 (lower = more similar)
    const hasStaticDistance = Jimp && typeof Jimp.distance === 'function';
    const hasStaticDiff = Jimp && typeof Jimp.diff === 'function';

    const perceptualDistance = hasStaticDistance
      ? Jimp.distance(imgRef, imgLive)
      : (typeof imgRef.distance === 'function' ? imgRef.distance(imgLive) : 1);

    const diffResult = hasStaticDiff
      ? Jimp.diff(imgRef, imgLive)
      : (typeof imgRef.diff === 'function' ? imgRef.diff(imgLive) : { percent: 1 });

    const diff = diffResult && typeof diffResult.percent === 'number'
      ? diffResult
      : { percent: 1 };

    const similarity = Math.max(0, 1 - perceptualDistance); // 0..1, higher=more similar
    const diffPercent = diff && typeof diff.percent === 'number' ? diff.percent : 1;

    // thresholds (tweak as needed)
  const MATCH_PERCEPTUAL_THRESHOLD = 0.60;
  const MATCH_DIFF_THRESHOLD = 0.35;

    const match = (perceptualDistance <= MATCH_PERCEPTUAL_THRESHOLD) && (diffPercent <= MATCH_DIFF_THRESHOLD);

    // persist face verification result in sessionData
    sessionData.faceVerification = {
      match,
      similarity: Number(similarity.toFixed(3)),
      diffPercent: Number(diffPercent.toFixed(3)),
      checkedAt: new Date().toISOString(),
      bypassed: false,
    };
    verificationSessionStore.set(sessionId, sessionData);

    return res.json({
      success: true,
      match,
      similarity: Number(similarity.toFixed(3)),
      diffPercent: Number(diffPercent.toFixed(3))
    });
  } catch (e) {
    const message = (e && e.message) ? e.message : 'Unknown face verification error';
    console.error('face-verify error:', message);
    if (e && e.stack) console.error(e.stack);
    return res.status(500).json({ success: false, error: message });
  }
});

// Add graceful shutdown helper so SIGINT/SIGTERM handlers can close server and persist DB
function shutdown(signal) {
  try {
    console.log(`Received ${signal}. Shutting down gracefully...`);
    if (server && typeof server.close === 'function') {
      server.close(() => {
        console.log('HTTP server closed.');
        try {
          if (db && typeof db.save === 'function') db.save();
        } catch (e) {
          console.error('Failed to save DB during shutdown:', e);
        }
        process.exit(0);
      });
      // In case server.close never calls back, ensure exit after timeout
      setTimeout(() => {
        console.warn('Forcing shutdown after timeout.');
        try {
          if (db && typeof db.save === 'function') db.save();
        } catch (e) {}
        process.exit(0);
      }, 5000).unref();
    } else {
      // no server to close, just persist and exit
      try {
        if (db && typeof db.save === 'function') db.save();
      } catch (e) {
        console.error('Failed to save DB during shutdown:', e);
      }
      process.exit(0);
    }
  } catch (err) {
    console.error('Shutdown error:', err);
    process.exit(1);
  }
}

// existing graceful shutdown code (leave unchanged)
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));