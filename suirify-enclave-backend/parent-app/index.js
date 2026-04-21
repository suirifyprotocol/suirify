const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const os = require('os');
require('dotenv').config();
const { govLookup, normalizeCountryKey } = require('./mockDB');
const { getIsoCode, getCountryList } = require('./countryCodes');
const { getPolicyId } = require('./jurisdictionPolicies');
const db = require('./persistentDB');
const fs = require('fs');
const path = require('path');
const net = require('net');
const { bcs } = require('@mysten/bcs');
const { fromHex } = require('@mysten/sui/utils');

// Configuration
// Connect to a local TCP port on the Parent OS, which tunnels to the Enclave
const PROXY_PORT = process.env.ENCLAVE_PROXY_PORT || PROXY_PORT; 
const PROXY_HOST = process.env.ENCLAVE_PROXY_HOST || '127.0.0.1';

// Parse the Policy Map from Environment
let POLICY_MAP = {};
try {
  const mapStr = process.env.JURISDICTION_POLICY_MAP;
  if (mapStr) {
    POLICY_MAP = JSON.parse(mapStr);
    console.log("Loaded Jurisdiction Policy Map:", Object.keys(POLICY_MAP));
  }
} catch (e) {
  console.warn("Failed to parse JURISDICTION_POLICY_MAP from .env", e.message);
}

// Helper to get Policy ID (replaces external file requirement if needed)
function resolvePolicyId(countryName) {
  // Check exact match
  if (POLICY_MAP[countryName]) return POLICY_MAP[countryName];
  
  // Check normalized match (e.g., "Nigeria" vs "nigeria")
  const norm = normalizeCountryKey(countryName);
  const found = Object.keys(POLICY_MAP).find(k => normalizeCountryKey(k) === norm);
  return found ? POLICY_MAP[found] : process.env.JURISDICTION_POLICY_ID || null;
}

// Ensure server-side WebSocket implementation exists for Sui subscriptions
let WebSocketImpl = null;
try {
  WebSocketImpl = require('ws');
  if (typeof global.WebSocket !== 'function') {
    global.WebSocket = WebSocketImpl;
  }
} catch (err) {
  console.warn('WebSocket polyfill unavailable; event subscriptions will fail:', err.message || err);
}

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

// Replace placeholder vars with actual resolution from installed sui package (with fallback)
let SuiClient = null;
let SuiGrpcClient = null;
let SuiGraphQLClient = null;
let GrpcTransport = null;
let ChannelCredentials = null;
let getFullnodeUrl = null;
let TransactionBlock = null;
let Ed25519Keypair = null;
let WebsocketClient = null;

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

try {
  ({ GrpcTransport } = require('@protobuf-ts/grpc-transport'));
  ({ ChannelCredentials } = require('@grpc/grpc-js'));
} catch (_e) {
  GrpcTransport = null;
  ChannelCredentials = null;
}

try {
  const sui = require('@mysten/sui');
  try {
    ({ SuiGrpcClient } = require('@mysten/sui/grpc'));
  } catch (_e) {
    SuiGrpcClient = null;
  }
  try {
    ({ SuiGraphQLClient } = require('@mysten/sui/graphql'));
  } catch (_e) {
    SuiGraphQLClient = null;
  }
  SuiClient = sui.SuiClient || (sui.client && sui.client.SuiClient) || null;
  getFullnodeUrl = sui.getFullnodeUrl || (sui.client && sui.client.getFullnodeUrl) || null;
  WebsocketClient = sui.WebsocketClient || (sui.client && sui.client.WebsocketClient) || null;
  TransactionBlock =
    sui.TransactionBlock ||
    sui.Transaction ||
    (sui.transactions && (sui.transactions.TransactionBlock || sui.transactions.Transaction)) ||
    null;
  Ed25519Keypair = sui.Ed25519Keypair || (sui.keypairs && sui.keypairs.Ed25519Keypair) || null;
  console.log('Loaded @mysten/sui exports.');
} catch (e1) {
  try {
    ({ SuiClient, getFullnodeUrl, WebsocketClient } = require('@mysten/sui/client'));
    try {
      ({ SuiGrpcClient } = require('@mysten/sui/grpc'));
    } catch (_e) {
      SuiGrpcClient = null;
    }
    try {
      ({ SuiGraphQLClient } = require('@mysten/sui/graphql'));
    } catch (_e) {
      SuiGraphQLClient = null;
    }
    const transactionsModule = require('@mysten/sui/transactions');
    TransactionBlock =
      transactionsModule.TransactionBlock ||
      transactionsModule.Transaction ||
      transactionsModule.default ||
      transactionsModule;
    ({ Ed25519Keypair } = require('@mysten/sui/keypairs/ed25519'));
    console.log('Loaded @mysten/sui.js subpath exports.');
  } catch (e2) {
    console.warn('Sui client packages not found. On-chain features disabled. To enable run:');
    console.warn('  cd suirify-backend && npm install @mysten/sui');
  }
}

TransactionBlock = normalizeTransactionBlockModule(TransactionBlock);

const app = express();
const BODY_LIMIT = process.env.REQUEST_BODY_LIMIT || '25mb';

const parsedOrigins = (process.env.ALLOWED_ORIGINS ?? '*')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);
const ALLOWED_ORIGINS = parsedOrigins.length ? parsedOrigins : ['*'];
const ALLOW_WILDCARD_ORIGINS = ALLOWED_ORIGINS.includes('*');
const allowedOriginSet = new Set(ALLOWED_ORIGINS.filter((origin) => origin !== '*'));

const isOriginAllowed = (origin) => {
  if (!origin) return true; // allow server-to-server/health checks without Origin header
  if (ALLOW_WILDCARD_ORIGINS) return true;
  return allowedOriginSet.has(origin);
};

app.use(bodyParser.json({ limit: BODY_LIMIT }));
app.use(bodyParser.urlencoded({ extended: true, limit: BODY_LIMIT }));
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const originAllowed = isOriginAllowed(origin);

  if (originAllowed && origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (ALLOW_WILDCARD_ORIGINS) {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }

  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return originAllowed ? res.sendStatus(200) : res.status(403).json({ error: 'Origin not allowed.' });
  }

  if (!originAllowed && origin) {
    return res.status(403).json({ error: 'Origin not allowed.' });
  }

  next();
});

app.get('/health', (req, res) => res.json({ ok: true, time: Date.now() }));

// compute SUI_GRPC now that getFullnodeUrl may be defined
const PORT = process.env.PORT || 4000;
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
const deriveWebsocketUrl = (rpcUrl) => {
  if (!rpcUrl) return null;
  if (/^wss?:\/\//i.test(rpcUrl)) return rpcUrl;
  if (/^https?:\/\//i.test(rpcUrl)) {
    return rpcUrl.replace(/^http/i, 'ws');
  }
  return null;
};
const SUI_RPC_WS = process.env.SUI_RPC_WS || deriveWebsocketUrl(SUI_GRPC);
const PACKAGE_ID = process.env.PACKAGE_ID;
const ADMIN_CAP_ID = process.env.ADMIN_CAP_ID;
const PROTOCOL_CONFIG_ID = process.env.PROTOCOL_CONFIG_ID;
const ATTESTATION_REGISTRY_ID = process.env.ATTESTATION_REGISTRY_ID;
const JURISDICTION_POLICY_ID = process.env.JURISDICTION_POLICY_ID;
const ADMIN_PRIVATE_KEY = process.env.ADMIN_PRIVATE_KEY || process.env.SPONSOR_PRIVATE_KEY || null;
const STATIC_MINT_FEE = process.env.MINT_FEE || null;
const BYPASS_FACE_MATCH = process.env.BYPASS_FACE_MATCH !== 'false';
const ADMIN_API_KEY = process.env.ADMIN_API_KEY || null;
const HOST = process.env.HOST || '0.0.0.0';
const MIST_PER_SUI = BigInt(1_000_000_000);

//ENCLAVE CONFIGURATION FROM ENVIRONMENT
// const ENCLAVE_CID = 3; // Default Context ID for the first enclave
// const ENCLAVE_PORT = 5000;
const ENCLAVE_CONFIG_ID = process.env.ENCLAVE_CONFIG_ID;
const ENCLAVE_OBJECT_ID = process.env.ENCLAVE_OBJECT_ID;



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
console.log(`Sui GraphQL endpoints: ${SUI_GRAPHQL_CANDIDATES.length ? SUI_GRAPHQL_CANDIDATES.join(', ') : 'not configured'}`);

let suiClient;
let adminKeypair; // This is the SPONSOR/ADMIN keypair, NOT the enclave's keypair.
let graphqlClient = null;
let attestationIndexerCursor = null;
let activeGraphqlIndex = 0;

function buildNativeGrpcTransport(rpcUrl) {
  if (!GrpcTransport || !ChannelCredentials || !rpcUrl) return null;
  try {
    const parsed = new URL(rpcUrl);
    return new GrpcTransport({
      host: parsed.host,
      channelCredentials: parsed.protocol === 'https:' ? ChannelCredentials.createSsl() : ChannelCredentials.createInsecure(),
    });
  } catch (_err) {
    return null;
  }
}

function getCoreClient(client) {
  if (!client) return null;
  return client.core && typeof client.core === 'object' ? client.core : null;
}

async function queryGraphQL(query, variables = {}) {
  if (!SUI_GRAPHQL_CANDIDATES.length) {
    throw new Error('GraphQL endpoint is not configured. Set SUI_GRAPHQL or SUI_GRAPHQL_LIST in env.');
  }

  let lastError = null;
  const total = SUI_GRAPHQL_CANDIDATES.length;
  const axios = require('axios');

  for (let offset = 0; offset < total; offset += 1) {
    const idx = (activeGraphqlIndex + offset) % total;
    const endpoint = SUI_GRAPHQL_CANDIDATES[idx];

    try {
      if (!graphqlClient && SuiGraphQLClient) {
        graphqlClient = new SuiGraphQLClient({ url: endpoint, network: SUI_NETWORK });
      }

      let body;
      if (graphqlClient && typeof graphqlClient.query === 'function') {
        body = await graphqlClient.query({ query, variables });
      } else {
        const response = await axios.post(endpoint, { query, variables }, { headers: { 'Content-Type': 'application/json' } });
        body = response && response.data ? response.data : null;
      }

      if (!body) {
        throw new Error('Empty GraphQL response.');
      }
      if (body.errors && body.errors.length) {
        throw new Error(body.errors.map((err) => err.message).join('; '));
      }

      if (idx !== activeGraphqlIndex) {
        activeGraphqlIndex = idx;
        graphqlClient = SuiGraphQLClient ? new SuiGraphQLClient({ url: endpoint, network: SUI_NETWORK }) : null;
        console.warn(`Switched active GraphQL endpoint to ${endpoint}`);
      }

      return body;
    } catch (err) {
      lastError = err;
      graphqlClient = null;
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
        transaction { digest }
        contents { json bcs type { repr } }
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

const buildWebsocketClient = () => {
  if (!WebsocketClient || typeof WebsocketClient !== 'function') return null;
  if (!WebSocketImpl || typeof WebSocketImpl !== 'function') return null;
  if (!SUI_RPC_WS) return null;
  try {
    return new WebsocketClient(SUI_RPC_WS, { WebSocket: WebSocketImpl });
  } catch (err) {
    console.warn('Failed to create Sui WebSocket client:', err && err.message ? err.message : err);
    return null;
  }
};

// Instantiate Sui client when available; load admin signer only if provided.
try {
  const ActiveSuiClientCtor = SuiGrpcClient || SuiClient;
  if (typeof ActiveSuiClientCtor === 'function') {
		try {
			const nativeTransport = SuiGrpcClient ? buildNativeGrpcTransport(SUI_GRPC) : null;
			const clientOptions = SuiGrpcClient
			  ? (nativeTransport ? { network: SUI_NETWORK, transport: nativeTransport } : { baseUrl: SUI_GRPC, network: SUI_NETWORK })
			  : { url: SUI_GRPC };
      const websocketClientInstance = buildWebsocketClient();
      if (websocketClientInstance) {
        clientOptions.websocketClient = websocketClientInstance;
      }
      suiClient = new ActiveSuiClientCtor(clientOptions);
      console.log(`Sui client instantiated (${SuiGrpcClient ? 'grpc' : 'rpc'}=${SUI_GRPC}${websocketClientInstance ? `, ws=${SUI_RPC_WS}` : ''}).`);
		} catch (e) {
			console.error('Failed to instantiate SuiClient:', e);
			suiClient = null;
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
  if (!suiClient || !PACKAGE_ID || !walletAddress) return null;
  try {
    const coreClient = getCoreClient(suiClient);
    if (!coreClient || typeof coreClient.getOwnedObjects !== 'function') return null;
    const ownedObjects = await coreClient.getOwnedObjects({
      address: walletAddress,
      type: `${PACKAGE_ID}::protocol::Suirify_Attestation`,
      limit: 1,
    });
    const firstObject = ownedObjects?.objects?.[0] || null;
    if (!firstObject || !firstObject.id) return null;
    const graphqlObject = await fetchGraphQLObject(firstObject.id);
    const summary = summarizeAttestationObject(toLegacyObjectSummary(graphqlObject));
    if (!summary) {
      return {
        objectId: firstObject.id,
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
  if (!suiClient || !PACKAGE_ID || !walletAddress) return null;
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
  } catch (err) {
    console.error('Failed to hydrate consumed mint requests from persistent storage:', err);
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
    //'bvn',
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


/// NEW HELPER FUNCTIONS FOR ENCLAVE INTEGRATION

/**
 * Sends a JSON payload to the Nitro Enclave via the local TCP Proxy.
 * The local socat instance (TCP:PROXY_PORT) forwards this to the Enclave (VSOCK:5000).
 * @param {object} payload The JSON object to send.
 * @returns {Promise<object>} The JSON response from the enclave.
 */
async function sendToEnclave(payload) {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    
    // Connect to localhost:PROXY_PORT (where socat is listening)
    socket.connect(PROXY_PORT, PROXY_HOST, () => {
      socket.write(JSON.stringify(payload));
    });

    socket.on('data', (buffer) => {
      try {
        const response = JSON.parse(buffer.toString());
        resolve(response);
        socket.destroy(); // Close connection after receiving response
      } catch (e) {
        reject(new Error("Invalid JSON response from enclave"));
      }
    });

    socket.on('error', (err) => {
      console.error("Enclave Proxy connection error:", err);
      reject(new Error("Failed to communicate with the secure enclave proxy. Ensure socat is running on port PROXY_PORT."));
    });
  });
}

/**
 * Serializes the minting data into the exact binary format the smart contract expects.
 * This MUST perfectly match the deserialization order in suirify::enclave::verify_response.
 * @param {object} data The data to serialize.
 * @returns {string} The hex-encoded string of the serialized data.
 */
function serializeMintPayload(data) {
  try {
    const toBytes = (hex) => {
      let clean = hex.startsWith('0x') ? hex.slice(2) : hex;
      if (clean.length < 64) {
        clean = clean.padStart(64, '0');
      }
      return Buffer.from(clean, 'hex');
    };

    // 1. Serialize Request ID (Address -> 32 bytes)
    const requestIdBytes = bcs.bytes(32).serialize(toBytes(data.requestId)).toBytes();
    // 2. Serialize Recipient (Address -> 32 bytes)
    const recipientBytes = bcs.bytes(32).serialize(toBytes(data.recipient)).toBytes();
    // 3. Serialize Jurisdiction Code (u16)
    const jurisdictionBytes = bcs.u16().serialize(data.jurisdictionCode).toBytes();
    // 4. Serialize Verification Level (u8)
    const levelBytes = bcs.u8().serialize(data.verificationLevel).toBytes();
    // 5. Serialize Verifier Source (u8)
    const sourceBytes = bcs.u8().serialize(data.verifierSource).toBytes();
    // 6. Serialize Name Hash (vector<u8>)
    const nameHashArray = Array.from(data.nameHash); 
    const nameHashBytes = bcs.vector(bcs.u8()).serialize(nameHashArray).toBytes();
    // 7. Serialize Booleans (bool)
    const humanBytes = bcs.bool().serialize(data.isHumanVerified).toBytes();
    const over18Bytes = bcs.bool().serialize(data.isOver18).toBytes();
    // 8. Serialize Verifier Version (u8)
    const versionBytes = bcs.u8().serialize(data.verifierVersion).toBytes();
    // 9. Serialize Issued Timestamp (u64) -> Force BigInt to avoid JS number errors
    const issuedBytes = bcs.u64().serialize(BigInt(data.issuedMs)).toBytes();

    // Combine all buffers in the EXACT order of the Move struct
    const combined = Buffer.concat([
      Buffer.from(requestIdBytes),
      Buffer.from(recipientBytes),
      Buffer.from(jurisdictionBytes),
      Buffer.from(levelBytes),
      Buffer.from(sourceBytes),
      Buffer.from(nameHashBytes),
      Buffer.from(humanBytes),
      Buffer.from(over18Bytes),
      Buffer.from(versionBytes),
      Buffer.from(issuedBytes)
    ]);

    return combined.toString('hex');

  } catch (e) {
    console.error("Serialization Error:", e);
    throw new Error(`Failed to serialize payload: ${e.message}`);
  }
}

/**
 * ENDPOINT 1: Check for an existing attestation & get dashboard data.
 */
app.get('/attestation/:walletAddress', async (req, res) => {
  if (!suiClient) return res.status(500).json({ error: 'Sui client is not configured.' });
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
    const dbSummary = summarizeStoredAttestation(walletAddress);

    if (chainSummary && chainSummary.objectId) {
      const mergedSummary = {
        ...chainSummary,
        jurisdictionCode: chainSummary.jurisdictionCode ?? dbSummary?.jurisdictionCode ?? null,
        verificationLevel: chainSummary.verificationLevel ?? dbSummary?.verificationLevel ?? null,
        issueDateMs: chainSummary.issueDateMs ?? dbSummary?.issueDateMs ?? null,
        expiryDateMs: chainSummary.expiryDateMs ?? dbSummary?.expiryDateMs ?? null,
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

    if (dbSummary && dbSummary.objectId) {
      const dashboardData = {
        objectId: dbSummary.objectId,
        jurisdictionCode: dbSummary.jurisdictionCode,
        verificationLevel: dbSummary.verificationLevel,
        issueDate: toIsoOrNull(dbSummary.issueDateMs),
        expiryDate: toIsoOrNull(dbSummary.expiryDateMs),
        status: dbSummary.statusLabel || dbSummary.status,
        statusCode: dbSummary.statusCode,
        revoked: Boolean(dbSummary.revoked),
      };
      return res.json({
        hasAttestation: true,
        isValid: Boolean(dbSummary.isValid),
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
app.post('/start-verification', (req, res) => {
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
    return res.status(409).json({
      error: 'This Government ID has already been used to mint an attestation.',
      existingWallet: existing.walletAddress || null
    });
  }

  const record = govLookup(normCountry, idNumber);
  if (!record) return res.status(404).json({ error: 'ID not found in the government database.' });

  const sessionId = crypto.randomBytes(16).toString('hex');

  // Resolve country-specific jurisdiction policy id (may come from env map or defaults)
  // const policyId = getPolicyId(normCountry) || JURISDICTION_POLICY_ID || null;
  const policyId = resolvePolicyId(country);
  if (!policyId) {
    // allow session creation but warn; creation can proceed if policy is optional downstream
    console.warn(`No jurisdiction policy id configured for country ${Country}.`);
  }

  // store resolved iso code and policyId so later steps don't need to re-resolve
  verificationSessionStore.set(sessionId, { govRecord: record, country: normCountry, idNumber, jurisdictionCode: iso, policyId });
  res.json({ success: true, sessionId, policyId });
});

/**
 * ENDPOINT 3: Complete verification after successful face scan.
 */
app.post('/complete-verification', async (req, res) => {
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
});

/**
 * Provide mint configuration so the frontend can construct mint requests client-side.
 */
app.get('/mint-config', async (_req, res) => {
  if (!suiClient) {
    return res.status(500).json({ error: 'Sui client is not configured on the server.' });
  }
  if (!PACKAGE_ID || !ATTESTATION_REGISTRY_ID) {
    return res.status(500).json({ error: 'Protocol package or registry id is not configured.' });
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
  });
});

/**
 * Check for an existing, unconsumed mint request for the given wallet address.
 */
app.get('/mint-request/:walletAddress', async (req, res) => {
  if (!suiClient) {
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
  if (!suiClient) {
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
      after: typeof req.query.cursor === 'string' && req.query.cursor.length ? req.query.cursor : null,
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
 * This version delegates the critical signing operation to the secure enclave.
 */
app.post('/finalize-mint', async (req, res) => {
  const { sessionId, requestId: rawRequestId, requestTxDigest } = req.body || {};

  if (!sessionId) {
    return res.status(400).json({ error: 'sessionId is required.' });
  }

  if (!suiClient) {
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
  if (!ENCLAVE_CONFIG_ID || !ENCLAVE_OBJECT_ID) {
    console.error('ENCLAVE_CONFIG_ID or ENCLAVE_OBJECT_ID is not set in the environment.');
    return res.status(500).json({ error: 'On-chain enclave objects are not configured on the server.' });
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
  const { userWalletAddress } = preparedData;
  let requestId = typeof rawRequestId === 'string' && rawRequestId.trim().length ? rawRequestId.trim() : null;
  let requestDigestInput = typeof requestTxDigest === 'string' && requestTxDigest.trim().length ? requestTxDigest.trim() : null;

  try {
    const pending = await getLatestPendingMintRequest(userWalletAddress, 50, requestId);
    if (!pending && !requestId) {
        return res.status(409).json({ error: 'No pending mint request found for this wallet. Please create a mint request first.' });
    }
    if (pending) {
        requestId = pending.requestId;
        if (!requestDigestInput) {
            requestDigestInput = pending.requestTxDigest || null;
        }
    }

    if (isRequestConsumed(requestId)) {
      return res.status(409).json({ error: 'Mint request has already been processed.' });
    }

    const existingAttestation = await getExistingAttestation(userWalletAddress);
    if (existingAttestation) {
      // Mark as consumed and update DB even if we don't mint
      markRequestConsumed(requestId, { note: 'Detected existing attestation', walletAddress: userWalletAddress, eventType: 'existing-attestation' });
      db.markUsedGovId(country, idNumber, { walletAddress: userWalletAddress, attestationId: existingAttestation.objectId, requestId });
      verificationSessionStore.delete(sessionId);
      return res.status(409).json({ error: 'Wallet already holds an attestation.', attestation: existingAttestation });
    }

    // 1. Prepare the data payload for the enclave from your verified session data.
    const {
        jurisdictionCode,
        verifierSource,
        verificationLevel,
        nameHash, // This is the Uint8Array from your existing buildNameHash function
        isHumanVerified,
        isOver18,
        verifierVersion
    } = preparedData;

    const payloadData = {
        requestId,
        recipient: userWalletAddress,
        jurisdictionCode,
        verificationLevel,
        verifierSource,
        nameHash: Array.from(nameHash), // Convert Uint8Array to a plain array for BCS serialization
        isHumanVerified,
        isOver18,
        verifierVersion,
        issuedMs: Date.now(),
    };

    // 2. Serialize this data into a hex string using the new BCS helper function.
    const payloadHex = serializeMintPayload(payloadData);

    // 3. Send the serialized payload to the enclave to be securely signed.
    const enclaveResponse = await sendToEnclave({
      command: 'SIGN_MINT_PAYLOAD',
      data: { payloadHex }
    });

    if (!enclaveResponse || !enclaveResponse.success) {
      console.error("Enclave signing failed:", enclaveResponse.error);
      return res.status(500).json({ success: false, error: 'Enclave failed to sign payload.', details: enclaveResponse.error });
    }

    // 4. Build the final Sui transaction using the signature from the enclave.
    // This transaction calls the `mint_attestation_with_enclave` function.
    const txb = new TransactionBlock();
    txb.moveCall({
      target: `${PACKAGE_ID}::protocol::mint_attestation_with_enclave`,
      arguments: [
        txb.object(ADMIN_CAP_ID),
        txb.object(PROTOCOL_CONFIG_ID),
        txb.object(ATTESTATION_REGISTRY_ID),
        txb.pure.id(requestId), // The mint request ID
        txb.object(policyObjectId), // The jurisdiction policy object
        txb.object(ENCLAVE_CONFIG_ID), // The on-chain enclave configuration
        txb.object(ENCLAVE_OBJECT_ID), // The on-chain registered enclave object
        txb.pure.vector('u8', Array.from(Buffer.from(payloadHex, 'hex'))), // The payload we just sent
        txb.pure.vector('u8', Array.from(Buffer.from(enclaveResponse.signature, 'base64'))), // The signature from the enclave
      ],
    });

    // 5. The parent application's admin/sponsor signs and executes the transaction block.
    // This pays the gas fees for the transaction.
    const coreClient = getCoreClient(suiClient);
    if (!coreClient || typeof coreClient.executeTransaction !== 'function') {
      throw new Error('Sui gRPC core executeTransaction is unavailable.');
    }

    const txBytes = await txb.build({ client: coreClient });
    const signature = await signTransactionWithKeypair(adminKeypair, txBytes);

    const executionResult = await coreClient.executeTransaction({
      transaction: txBytes,
      signatures: [signature],
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
            attestationId: attestationObjectId,
            statusCode: attestationSummary?.statusCode ?? null,
            statusLabel: attestationSummary?.statusLabel || null,
            jurisdictionCode: attestationSummary?.jurisdictionCode ?? null,
            verificationLevel: attestationSummary?.verificationLevel ?? null,
        });
    }

    pendingMints.set(userWalletAddress, { country, idNumber, requestId, attestationId: attestationObjectId, attestationSummary, fullNameHash: auditNameHash });
    db.markUsedGovId(country, idNumber, { walletAddress: userWalletAddress, requestId, finalizeDigest: digest, attestationId: attestationObjectId, fullNameHash: auditNameHash });
    verificationSessionStore.delete(sessionId);

    res.json({
      success: true,
      digest,
      finalizeTxDigest: digest,
      attestationId: attestationObjectId,
      effects: executionResult?.transaction?.effects ?? null,
      objectChanges: executionResult?.transaction?.effects?.changedObjects ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Failed to finalize mint:', message, error.stack);
    res.status(500).json({ success: false, error: 'Failed to finalize mint transaction.', details: message });
  }
});

/**
 * Event Indexer for final, permanent storage.
 */
async function startIndexer() {
  if (!suiClient) {
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
      await queryGraphQL('{ chainIdentifier }', {});
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
              attestationId: attestationObjectIdFromEvent,
              walletAddress: recipient,
            });
          }
          if (!recipient) continue;

          const pendingMint = pendingMints.get(recipient);
          if (pendingMint) {
            try {
              db.markUsedGovId(
                pendingMint.country,
                pendingMint.idNumber,
                {
                  walletAddress: recipient,
                  eventType: 'indexer-attestation',
                  source: 'event-indexer',
                  indexedAt: new Date().toISOString(),
                  requestId: pendingMint.requestId,
                  attestationId: pendingMint.attestationId || attestationObjectIdFromEvent,
                  fullNameHash: pendingMint.fullNameHash || null
                }
              );
              console.log(`✅ SUCCESS: Recorded attestation for wallet ${recipient}`);
            } catch (e) {
              console.error('Failed to mark gov id as used in persistent DB:', e);
            }
            pendingMints.delete(recipient);
          }
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

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception — keeping process alive:', err && err.stack ? err.stack : err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

let server = null;
const START_PORT = parseInt(process.env.PORT, 10) || 4000;
const MAX_RETRIES = 10;

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
      }
      try {
        startIndexer();
      } catch (e) {
        console.error('Error starting indexer:', e);
      }
    });

    server.on('error', (err) => {
      if (err && err.code === 'EADDRINUSE') {
        console.warn(`Port ${port} already in use. Trying port ${port + 1} ...`);
        setTimeout(() => startServer(port + 1, attempts + 1), 200);
      } else {
        console.error('HTTP server error:', err);
      }
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

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
  if (/^https?:\/\//i.test(photoRef)) return photoRef;

  const candidatePaths = [
      path.join(__dirname, photoRef),
      path.join(__dirname, 'reference_photos', path.basename(photoRef))
  ];

  for (const filePath of candidatePaths) {
    try {
      if (fs.existsSync(filePath)) {
        const data = await fs.promises.readFile(filePath);
        const ext = path.extname(filePath).slice(1).toLowerCase() || 'jpeg';
        return `data:image/${ext};base64,${data.toString('base64')}`;
      }
    } catch (err) {
      // Ignore and try next path
    }
  }
  return null;
}

app.post('/face-verify', async (req, res) => {
  const { sessionId, livePhoto } = req.body;
  if (!sessionId || !livePhoto) return res.status(400).json({ success: false, error: 'sessionId and livePhoto are required' });

  const sessionData = verificationSessionStore.get(sessionId);
  if (!sessionData || !sessionData.govRecord) return res.status(404).json({ success: false, error: 'Verification session not found or invalid' });

  if (BYPASS_FACE_MATCH || !Jimp || typeof Jimp.read !== 'function') {
    sessionData.faceVerification = { match: true, similarity: 1, bypassed: true };
    verificationSessionStore.set(sessionId, sessionData);
    return res.json({ success: true, match: true, similarity: 1, bypassed: true });
  }

  try {
    const refPhotoUrl = await resolvePhotoReference(sessionData.govRecord.photoReference);
    if (!refPhotoUrl) return res.status(404).json({ success: false, error: 'Reference photo could not be resolved.' });
    
    const refBuffer = decodeDataUrl(refPhotoUrl);
    const liveBuffer = decodeDataUrl(livePhoto);

    if (!refBuffer || !liveBuffer) return res.status(422).json({ success: false, error: 'Failed to decode photo data.' });
    
    const [imgRef, imgLive] = await Promise.all([Jimp.read(refBuffer), Jimp.read(liveBuffer)]);
    
    imgRef.resize(256, 256);
    imgLive.resize(256, 256);

    const distance = Jimp.distance(imgRef, imgLive);
    const diff = Jimp.diff(imgRef, imgLive);
    
    const similarity = 1 - distance;
    const match = similarity > 0.85 && diff.percent < 0.15;

    sessionData.faceVerification = { match, similarity, diffPercent: diff.percent };
    verificationSessionStore.set(sessionId, sessionData);

    return res.json({ success: true, match, similarity, diffPercent: diff.percent });
  } catch (e) {
    console.error('face-verify error:', e.message);
    return res.status(500).json({ success: false, error: 'Face verification failed.' });
  }
});

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
    } else {
      process.exit(0);
    }
  } catch (err) {
    console.error('Shutdown error:', err);
    process.exit(1);
  }
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));