const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const os = require('os');
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const { govLookup, normalizeCountryKey } = require('./mockDB');
const { getIsoCode, getCountryList } = require('./countryCodes');
const { getPolicyId } = require('./jurisdictionPolicies');
const db = require('./persistentDB');

// Nautilus Enclave integration
const vsock = require('vsock');
const { BCS, getSuiMoveConfig } = require('@mysten/bcs');

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
let getFullnodeUrl = null;
let TransactionBlock = null;
let Ed25519Keypair = null;

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
  const sui = require('@mysten/sui');
  SuiClient = sui.SuiClient || (sui.client && sui.client.SuiClient) || null;
  getFullnodeUrl = sui.getFullnodeUrl || (sui.client && sui.client.getFullnodeUrl) || null;
  TransactionBlock =
    sui.TransactionBlock ||
    sui.Transaction ||
    (sui.transactions && (sui.transactions.TransactionBlock || sui.transactions.Transaction)) ||
    null;
  Ed25519Keypair = sui.Ed25519Keypair || (sui.keypairs && sui.keypairs.Ed25519Keypair) || null;
  console.log('Loaded @mysten/sui exports.');
} catch (e1) {
  try {
    ({ SuiClient, getFullnodeUrl } = require('@mysten/sui/client'));
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

// compute SUI_RPC now that getFullnodeUrl may be defined
const PORT = process.env.PORT || 4000;
const SECRET_PEPPER = process.env.SECRET_PEPPER || '';
const SUI_NETWORK = process.env.SUI_NETWORK || 'devnet';
const DEFAULT_RPC_BY_NETWORK = {
  devnet: 'https://fullnode.devnet.sui.io:443',
  testnet: 'https://fullnode.testnet.sui.io:443',
  mainnet: 'https://fullnode.mainnet.sui.io:443',
  localnet: 'http://127.0.0.1:9000',
};
const networkFallbackRpc = DEFAULT_RPC_BY_NETWORK[SUI_NETWORK] || DEFAULT_RPC_BY_NETWORK.devnet;
const SUI_RPC = process.env.SUI_RPC || (typeof getFullnodeUrl === 'function' ? getFullnodeUrl(SUI_NETWORK) : networkFallbackRpc);
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

// Nautilus Enclave configuration
const ENCLAVE_CID = parseInt(process.env.ENCLAVE_CID, 10) || 3; // Default Context ID for the first enclave
const ENCLAVE_PORT = parseInt(process.env.ENCLAVE_PORT, 10) || 5000;
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

console.log(`Sui network configured: ${SUI_NETWORK} (rpc: ${SUI_RPC})`);

let suiClient;
let adminKeypair; // This is the SPONSOR/ADMIN keypair, NOT the enclave's keypair.

// Instantiate Sui client when available; load admin signer only if provided.
try {
	if (typeof SuiClient === 'function') {
		try {
			suiClient = new SuiClient({ url: SUI_RPC });
			console.log(`Sui client instantiated (rpc=${SUI_RPC}).`);
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

function extractAttestationFromChanges(objectChanges) {
  if (!Array.isArray(objectChanges)) return null;
  for (const change of objectChanges) {
    if (!change || typeof change !== 'object') continue;
    if (change.type !== 'created' && change.type !== 'mutated') continue;
    const objectType = change.objectType || change.type_ || null;
    if (!objectType || objectType !== `${PACKAGE_ID}::protocol::Suirify_Attestation`) continue;
    const fields = change.objectFields || change.fields || (change.content && change.content.fields) || null;
    if (!fields) continue;
    const objectId = change.objectId || (change.reference && change.reference.objectId) || null;
    const summary = summarizeAttestationObject({ data: { objectId, content: { fields } } });
    if (summary) {
      return summary;
    }
  }
  return null;
}

async function getExistingAttestation(walletAddress) {
  if (!suiClient || !PACKAGE_ID || !walletAddress) return null;
  try {
    const ownedObjects = await suiClient.getOwnedObjects({
      owner: walletAddress,
      filter: { StructType: `${PACKAGE_ID}::protocol::Suirify_Attestation` },
      options: { showContent: true },
    });
    const attestationObject = ownedObjects?.data?.find((obj) => obj && !obj.error);
    const summary = summarizeAttestationObject(attestationObject);
    if (!summary) return null;
    return {
      objectId: summary.objectId,
      jurisdictionCode: summary.jurisdictionCode,
      verificationLevel: summary.verificationLevel,
      issueDateMs: summary.issueDateMs,
      expiryDateMs: summary.expiryDateMs,
      status: summary.statusLabel,
      statusCode: summary.status,
      isValid: summary.isValid,
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
    const filter = { MoveEventType: `${PACKAGE_ID}::protocol::MintRequestCreated` };

    const response = await suiClient.queryEvents({ query: filter, limit });
    const events = Array.isArray(response?.data) ? response.data.slice() : [];
    events.sort((a, b) => {
      const aTs = a?.timestampMs ? Number(a.timestampMs) : 0;
      const bTs = b?.timestampMs ? Number(b.timestampMs) : 0;
      return bTs - aTs;
    });

  let fallbackMatch = null;
  const preferLower = typeof preferredRequestId === 'string' ? preferredRequestId.toLowerCase() : null;

  for (const event of events) {
      const parsed = event?.parsedJson || {};
      const requestId = parsed.request_id || parsed.requestId || null;
      const requester = parsed.requester || parsed.requester_address || null;
      if (!requestId || typeof requestId !== 'string' || !requester) continue;
  if (requester.toLowerCase() !== normalizedWallet.toLowerCase()) continue;
      if (isRequestConsumed(requestId)) continue;

      const digest = (event?.id && event.id.txDigest) || event?.txDigest || event?.transactionDigest || event?.digest || null;
      const eventSeq = event?.id && event.id.eventSeq !== undefined ? event.id.eventSeq : null;

      const record = {
        requestId,
        requestTxDigest: digest,
        eventSequence: eventSeq,
        timestampMs: event?.timestampMs || null,
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

/// NAUTILUS ENCLAVE INTEGRATION FUNCTIONS

/**
 * Sends a JSON payload to the Nitro Enclave over a secure VSOCK channel.
 * @param {object} payload The JSON object to send.
 * @returns {Promise<object>} The JSON response from the enclave.
 */
async function sendToEnclave(payload) {
  return new Promise((resolve, reject) => {
    const socket = vsock.connect(ENCLAVE_CID, ENCLAVE_PORT);
    socket.on('connect', () => {
      socket.write(JSON.stringify(payload));
    });
    socket.on('data', (buffer) => {
      try {
        const response = JSON.parse(buffer.toString());
        resolve(response);
      } catch (e) {
        reject(new Error("Invalid JSON response from enclave"));
      } finally {
        socket.end();
      }
    });
    socket.on('error', (err) => {
      console.error("VSOCK connection error:", err);
      reject(new Error("Failed to communicate with the secure enclave."));
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
  const bcs = new BCS(getSuiMoveConfig());
  const writer = bcs.writer();

  writer.write(bcs.ser('address', data.requestId).toBytes());
  writer.write(bcs.ser('address', data.recipient).toBytes());
  writer.write16(data.jurisdictionCode);
  writer.write8(data.verificationLevel);
  writer.write8(data.verifierSource);
  writer.writeVec(data.nameHash, (w, el) => w.write8(el)); // Serialize vector<u8>
  writer.write8(data.isHumanVerified ? 1 : 0); // Serialize bool as u8
  writer.write8(data.isOver18 ? 1 : 0); // Serialize bool as u8
  writer.write8(data.verifierVersion);
  writer.write64(BigInt(data.issuedMs)); // Serialize u64

  return Buffer.from(writer.getBytes()).toString('hex');
}

/**
 * ENDPOINT 1: Check for an existing attestation & get dashboard data.
 */
app.get('/attestation/:walletAddress', async (req, res) => {
  if (!suiClient) return res.status(500).json({ error: 'Sui client is not configured.' });
  const { walletAddress } = req.params;
  try {
    const storedSummary = summarizeStoredAttestation(walletAddress);
    const toIsoOrNull = (ms) => {
      if (ms === null || ms === undefined) return null;
      const date = new Date(ms);
      return Number.isNaN(date.getTime()) ? null : date.toISOString();
    };

    if (storedSummary && storedSummary.objectId) {
      const dashboardData = {
        objectId: storedSummary.objectId,
        jurisdictionCode: storedSummary.jurisdictionCode,
        verificationLevel: storedSummary.verificationLevel,
        issueDate: toIsoOrNull(storedSummary.issueDateMs),
        expiryDate: toIsoOrNull(storedSummary.expiryDateMs),
        status: storedSummary.statusLabel || storedSummary.status,
        statusCode: storedSummary.status,
        source: 'db',
      };
      return res.json({ hasAttestation: true, isValid: storedSummary.isValid, data: dashboardData, source: 'db' });
    }

    const ownedObjects = await suiClient.getOwnedObjects({
      owner: walletAddress,
      filter: { StructType: `${PACKAGE_ID}::protocol::Suirify_Attestation` },
      options: { showContent: true },
    });
    const attestationObject = ownedObjects.data.find((obj) => !obj.error);
    const summary = summarizeAttestationObject(attestationObject);
    if (!summary) return res.json({ hasAttestation: false, isValid: false, data: null });

    const dashboardData = {
      objectId: summary.objectId,
      jurisdictionCode: summary.jurisdictionCode,
      verificationLevel: summary.verificationLevel,
      issueDate: toIsoOrNull(summary.issueDateMs),
      expiryDate: toIsoOrNull(summary.expiryDateMs),
      status: summary.statusLabel,
      statusCode: summary.status,
      revoked: summary.revoked,
    };
    res.json({ hasAttestation: true, isValid: summary.isValid, data: dashboardData, source: 'chain' });
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
  const policyId = getPolicyId(normCountry) || JURISDICTION_POLICY_ID || null;
  if (!policyId) {
    // allow session creation but warn; creation can proceed if policy is optional downstream
    console.warn(`No jurisdiction policy id configured for country ${normCountry}.`);
  }

  // store resolved iso code and policyId so later steps don't need to re-resolve
  verificationSessionStore.set(sessionId, { govRecord: record, country: normCountry, idNumber, jurisdictionCode: iso, policyId });
  res.json({ success: true, sessionId });
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

    sessionData.preparedData = {
      userWalletAddress: walletAddress,
      jurisdictionCode: resolvedIso,
      verifierSource: 1,
      verificationLevel: 2,
      nameHash,
      isHumanVerified: true,
      isOver18: age >= 18,
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
      const configObject = await suiClient.getObject({ id: PROTOCOL_CONFIG_ID, options: { showContent: true } });
      const fields = configObject?.data?.content?.fields;
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
 * Returns the most recent MintRequestCreated event (if any) that matches the wallet
 * and has not yet been finalised by this server instance.
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
  const response = await suiClient.queryEvents({ query, limit, cursor: cursorParam });
    const events = Array.isArray(response?.data) ? response.data : [];
    const items = [];

    for (const event of events) {
      const parsed = event?.parsedJson || {};
      const requestId = parsed.request_id || parsed.requestId || null;
      const requester = parsed.requester || parsed.requester_address || null;
      const txDigest = (event?.id && event.id.txDigest) || event?.txDigest || event?.transactionDigest || event?.digest || null;
      const eventSeq = event?.id && event.id.eventSeq !== undefined ? event.id.eventSeq : null;
      const timestampMs = event?.timestampMs || null;
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
      nextCursor: response?.nextCursor || null,
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
 * This version delegates the critical signing operation to the secure Nautilus enclave.
 */
app.post('/finalize-mint', async (req, res) => {
  const { sessionId, requestId: rawRequestId, requestTxDigest } = req.body || {};

  if (!sessionId) {
    return res.status(400).json({ error: 'sessionId is required.' });
  }

  let requestId = typeof rawRequestId === 'string' && rawRequestId.trim().length ? rawRequestId.trim() : null;
  let requestDigestInput = typeof requestTxDigest === 'string' && requestTxDigest.trim().length ? requestTxDigest.trim() : null;

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
    console.warn('ENCLAVE_CONFIG_ID or ENCLAVE_OBJECT_ID is not set. Falling back to non-enclave minting.');
    // Continue without enclave - will use old minting flow
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

  const { userWalletAddress, jurisdictionCode, verifierSource, verificationLevel, nameHash, isHumanVerified, isOver18, verifierVersion } = preparedData;

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
    // Check if we should use enclave-based minting
    const useEnclave = !!(ENCLAVE_CONFIG_ID && ENCLAVE_OBJECT_ID);
    
    if (useEnclave) {
      // NAUTILUS ENCLAVE MINTING PATH
      console.log('Using Nautilus enclave for secure minting...');
      
      // 1. Prepare the data payload for the enclave
      const payloadData = {
        requestId,
        recipient: userWalletAddress,
        jurisdictionCode,
        verificationLevel,
        verifierSource,
        nameHash: Array.from(nameHash), // Convert Uint8Array to plain array for BCS
        isHumanVerified,
        isOver18,
        verifierVersion,
        issuedMs: Date.now(),
      };

      // 2. Serialize this data into a hex string using BCS
      const payloadHex = serializeMintPayload(payloadData);

      // 3. Send the serialized payload to the enclave to be securely signed
      const enclaveResponse = await sendToEnclave({
        command: 'SIGN_MINT_PAYLOAD',
        data: { payloadHex }
      });

      if (!enclaveResponse || !enclaveResponse.success) {
        console.error("Enclave signing failed:", enclaveResponse?.error);
        return res.status(500).json({ 
          success: false, 
          error: 'Enclave failed to sign payload.', 
          details: enclaveResponse?.error 
        });
      }

      // 4. Build the Sui transaction using the signature from the enclave
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
          txb.pure.vector('u8', Array.from(Buffer.from(payloadHex, 'hex'))), // The payload
          txb.pure.vector('u8', Array.from(Buffer.from(enclaveResponse.signature, 'base64'))), // The enclave signature
        ],
      });

      // 5. The parent application's admin/sponsor signs and executes the transaction
      const executionResult = await suiClient.signAndExecuteTransactionBlock({
        signer: adminKeypair,
        transactionBlock: txb,
        options: { showEffects: true, showEvents: true, showObjectChanges: true },
        requestType: 'WaitForLocalExecution',
      });

      const digest = executionResult?.digest;
      const attestationSummary = extractAttestationFromChanges(executionResult?.objectChanges);
      const attestationObjectId = attestationSummary?.objectId || null;

      if (requestId && typeof requestId === 'string') {
        markRequestConsumed(requestId, {
          finalizedAt: new Date().toISOString(),
          finalizeDigest: digest,
          walletAddress: userWalletAddress,
          eventType: 'mint-finalized',
          source: 'finalize-handler-enclave',
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
              source: 'finalize-handler-enclave',
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
        objectChanges: executionResult?.objectChanges ?? null,
        enclaveUsed: true,
      });
    } else {
      // FALLBACK: LEGACY NON-ENCLAVE MINTING PATH
      console.log('Using legacy non-enclave minting (enclave not configured)...');
      
      const txb = new TransactionBlock();
      const adminAddress = adminKeypair.getPublicKey().toSuiAddress();

      const nameHashVector = typeof txb.pure.vector === 'function'
        ? txb.pure.vector('u8', Array.from(nameHash))
        : txb.pure(Array.from(nameHash));

      txb.moveCall({
        target: `${PACKAGE_ID}::protocol::mint_attestation`,
        arguments: [
          txb.object(ADMIN_CAP_ID),
          txb.object(PROTOCOL_CONFIG_ID),
          txb.object(ATTESTATION_REGISTRY_ID),
          txb.pure.address(requestId),
          txb.object(policyObjectId),
          txb.pure.address(userWalletAddress),
          txb.pure.u16(Number(jurisdictionCode)),
          txb.pure.u8(Number(verifierSource)),
          txb.pure.u8(Number(verificationLevel)),
          nameHashVector,
          txb.pure.bool(Boolean(isHumanVerified)),
          txb.pure.bool(Boolean(isOver18)),
          txb.pure.u8(Number(verifierVersion)),
        ],
      });

      txb.setSender(adminAddress);
      txb.setGasBudget(50_000_000);

      const txBytes = await txb.build({ client: suiClient });
      const signature = await signTransactionWithKeypair(adminKeypair, txBytes);
      const txBase64 = Buffer.from(txBytes).toString('base64');

      const executionResult = await suiClient.executeTransactionBlock({
        transactionBlock: txBase64,
        signature,
        options: { showEffects: true, showEvents: true, showObjectChanges: true },
        requestType: 'WaitForLocalExecution',
      });

      const digest = executionResult?.digest || executionResult?.effects?.transactionDigest || null;
      const attestationSummary = extractAttestationFromChanges(executionResult?.objectChanges);
      const attestationObjectId = attestationSummary?.objectId || null;

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
        objectChanges: executionResult?.objectChanges ?? null,
        enclaveUsed: false,
      });
    }
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
  if (!suiClient) {
    console.warn('Cannot start indexer: Sui client not configured.');
    return;
  }
  console.log('Starting event indexer...');
  try {
    await suiClient.subscribeEvent({
      filter: { MoveEventType: `${PACKAGE_ID}::protocol::AttestationMinted` },
      onMessage: async (event) => {
        // Be a bit defensive about payload shape
        const recipient =
          (event && event.payload && event.payload.recipient) ||
          (event && event.parsedJson && event.parsedJson.recipient) ||
          null;
        const requestIdFromEvent =
          (event && event.payload && event.payload.request_id) ||
          (event && event.parsedJson && (event.parsedJson.request_id || event.parsedJson.requestId)) ||
          null;
        const attestationObjectIdFromEvent =
          (event && event.payload && event.payload.objectId) ||
          (event && event.parsedJson && event.parsedJson.objectId) ||
          null;
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
        if (!recipient) return;

        const pendingMint = pendingMints.get(recipient);
        if (pendingMint) {
          let attSummary = pendingMint.attestationSummary;
          if (!attSummary) {
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
              console.log(`✅ SUCCESS: Recorded attestation for wallet ${recipient} (country=${pendingMint.country}, idHash=${record.idHash.slice(0, 12)}…).`);
            } else {
              console.log(`✅ SUCCESS: Recorded attestation for wallet ${recipient} (country=${pendingMint.country}).`);
            }
          } catch (e) {
            console.error('Failed to mark gov id as used in persistent DB:', e);
          }
          pendingMints.delete(recipient);
        }
      },
    });
    console.log('Indexer successfully subscribed to events.');
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
        console.warn(`Port ${port} already in use. Trying port ${port + 1} ...`);
        // give a short delay then try next port
        setTimeout(() => startServer(port + 1, attempts + 1), 200);
      } else {
        console.error('HTTP server error:', err);
      }
    });
  } catch (err) {
    if (err && err.code === 'EADDRINUSE') {
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

// POST /face-verify
app.post('/face-verify', async (req, res) => {
  const { sessionId, livePhoto } = req.body;
  if (!sessionId || !livePhoto) return res.status(400).json({ success: false, error: 'sessionId and livePhoto are required' });

  const sessionData = verificationSessionStore.get(sessionId);
  if (!sessionData || !sessionData.govRecord) return res.status(404).json({ success: false, error: 'Verification session not found or invalid' });

  if (BYPASS_FACE_MATCH || !Jimp || typeof Jimp.read !== 'function') {
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