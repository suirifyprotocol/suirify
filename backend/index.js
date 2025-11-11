const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');
require('dotenv').config();
const { govLookup, normalizeCountryKey } = require('./mockDB');
const { getIsoCode, getCountryList } = require('./countryCodes'); // added
const db = require('./persistentDB');
let Jimp;
try {
  // Support both CommonJS and ESM default export shapes
  const _jimp = require('jimp');
  Jimp = _jimp && _jimp.default ? _jimp.default : _jimp;
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

try {
  const sui = require('@mysten/sui');
  SuiClient = sui.SuiClient || (sui.client && sui.client.SuiClient) || null;
  getFullnodeUrl = sui.getFullnodeUrl || (sui.client && sui.client.getFullnodeUrl) || null;
  TransactionBlock = sui.TransactionBlock || (sui.transactions && sui.transactions.TransactionBlock) || null;
  Ed25519Keypair = sui.Ed25519Keypair || (sui.keypairs && sui.keypairs.Ed25519Keypair) || null;
  console.log('Loaded @mysten/sui exports.');
} catch (e1) {
  try {
    ({ SuiClient, getFullnodeUrl } = require('@mysten/sui/client'));
    ({ TransactionBlock } = require('@mysten/sui/transactions'));
    ({ Ed25519Keypair } = require('@mysten/sui/keypairs/ed25519'));
    console.log('Loaded @mysten/sui.js subpath exports.');
  } catch (e2) {
    console.warn('Sui client packages not found. On-chain features disabled. To enable run:');
    console.warn('  cd suirify-backend && npm install @mysten/sui');
  }
}

const app = express();
app.use(bodyParser.json());
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
const SUI_RPC = process.env.SUI_RPC || (typeof getFullnodeUrl === 'function' ? getFullnodeUrl('devnet') : 'https://fullnode.devnet.sui.io:443');
const PACKAGE_ID = process.env.PACKAGE_ID;
const ADMIN_CAP_ID = process.env.ADMIN_CAP_ID;
const PROTOCOL_CONFIG_ID = process.env.PROTOCOL_CONFIG_ID;
const ATTESTATION_REGISTRY_ID = process.env.ATTESTATION_REGISTRY_ID;
const JURISDICTION_POLICY_ID = process.env.JURISDICTION_POLICY_ID;
const SPONSOR_PRIVATE_KEY = process.env.SPONSOR_PRIVATE_KEY;
const MINT_FEE = BigInt(process.env.MINT_FEE || 100000000);

let suiClient;
let sponsorKeypair;

if (PACKAGE_ID && SPONSOR_PRIVATE_KEY) {
  suiClient = new SuiClient({ url: SUI_RPC });
  try {
    const raw = Buffer.from(SPONSOR_PRIVATE_KEY, 'base64');
    sponsorKeypair = Ed25519Keypair.fromSecretKey(raw.slice(1));
    console.log(`Sponsor address loaded: ${sponsorKeypair.getPublicKey().toSuiAddress()}`);
  } catch (e) {
    console.error('Failed to load SPONSOR_PRIVATE_KEY. Make sure it is a valid Base64 Ed25519 private key.', e);
  }
} else {
  console.warn('Sui or sponsor env variables are not fully configured. On-chain features may fail.');
}

const verificationSessionStore = new Map();
const pendingMints = new Map();

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

/**
 * ENDPOINT 1: Check for an existing attestation & get dashboard data.
 */
app.get('/attestation/:walletAddress', async (req, res) => {
  if (!suiClient) return res.status(500).json({ error: 'Sui client is not configured.' });
  const { walletAddress } = req.params;
  try {
    const ownedObjects = await suiClient.getOwnedObjects({
      owner: walletAddress,
      filter: { StructType: `${PACKAGE_ID}::protocol::Suirify_Attestation` },
      options: { showContent: true },
    });
    const attestationObject = ownedObjects.data.find((obj) => !obj.error);
    if (!attestationObject) return res.json({ hasAttestation: false, data: null });

    const fields = attestationObject.data.content.fields;
    const dashboardData = {
      objectId: attestationObject.data.objectId,
      jurisdictionCode: fields.jurisdiction_code,
      verificationLevel: fields.verification_level,
      issueDate: new Date(parseInt(fields.issue_time_ms, 10)).toISOString(),
      expiryDate: new Date(parseInt(fields.expiry_time_ms, 10)).toISOString(),
      status: fields.revoked ? 'Revoked' : 'Active',
    };
    res.json({ hasAttestation: true, data: dashboardData });
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
app.post('/complete-verification', (req, res) => {
  const { sessionId, walletAddress } = req.body;
  if (!sessionId || !walletAddress) return res.status(400).json({ error: 'SessionID and walletAddress are required.' });

  const sessionData = verificationSessionStore.get(sessionId);
  if (!sessionData) return res.status(404).json({ error: 'Verification session not found or expired.' });

  const { govRecord, jurisdictionCode: resolvedIso } = sessionData;
  const normalizedName = normalizeName(govRecord.fullName);

  // use canonical, versioned name hashing that returns a Uint8Array
  let nameHash;
  try {
    nameHash = buildNameHash(normalizedName, walletAddress, SECRET_PEPPER, 1); // version 1
  } catch (e) {
    console.error('Failed to build name hash:', e);
    return res.status(500).json({ error: 'Failed to build name hash.' });
  }

  const birthDate = new Date(govRecord.dateOfBirth);
  const age = new Date(Date.now() - birthDate.getTime()).getUTCFullYear() - 1970;

  sessionData.preparedData = {
    userWalletAddress: walletAddress,
    jurisdictionCode: resolvedIso, // use resolved ISO from start-verification
    verifierSource: 1,
    verificationLevel: 2,
    nameHash, // Uint8Array(32)
    isHumanVerified: true,
    isOver18: age >= 18,
    verifierVersion: 1,
  };
  verificationSessionStore.set(sessionId, sessionData);

  // Log only the hash hex (safe to debug) — do NOT log raw inputs or the pepper.
  console.debug('Prepared nameHash (hex):', Buffer.from(nameHash).toString('hex'));

  res.json({ success: true, consentData: govRecord });
});

/**
 * ENDPOINT 4: Create the sponsored transaction after user consent.
 */
app.post('/create-mint-tx', async (req, res) => {
  const { sessionId } = req.body;
  if (!sessionId) return res.status(400).json({ error: 'SessionID is required.' });

  // Guard: ensure the Sui client is configured before doing any Sui calls
  if (!suiClient) {
    console.warn('create-mint-tx called but suiClient is not configured.');
    return res.status(500).json({ error: 'Sui client is not configured on the server. On-chain features disabled.' });
  }

  const sessionData = verificationSessionStore.get(sessionId);
  if (!sessionData || !sessionData.preparedData) return res.status(404).json({ error: 'Verification session incomplete.' });

  const { preparedData, country, idNumber, policyId: sessionPolicyId } = sessionData;
  const { userWalletAddress } = preparedData;

  // Validate nameHash is the expected type and length before building tx
  if (!preparedData.nameHash || !(preparedData.nameHash instanceof Uint8Array) || preparedData.nameHash.length !== 32) {
    return res.status(500).json({ error: 'Invalid nameHash prepared for transaction.' });
  }

  // Determine which jurisdiction policy object to pass to the Move call:
  // prefer session-specific policyId, fall back to global env JURISDICTION_POLICY_ID
  const policyObjectId = sessionPolicyId || JURISDICTION_POLICY_ID;
  if (!policyObjectId) {
    console.error('No jurisdiction policy object id available for this mint operation.');
    return res.status(500).json({ error: 'Jurisdiction policy not configured for this country.' });
  }

  try {
    const txb = new TransactionBlock();

    // Defensive: ensure suiClient has getCoins method
    if (typeof suiClient.getCoins !== 'function') {
      console.error('suiClient is present but does not expose getCoins().');
      return res.status(500).json({ error: 'Sui client is misconfigured (missing getCoins).' });
    }

    const coins = await suiClient.getCoins({ owner: userWalletAddress, coinType: '0x2::sui::SUI' });
    const paymentCoin = coins.data.find((coin) => BigInt(coin.balance) >= MINT_FEE);
    if (!paymentCoin) return res.status(400).json({ error: `User does not have a coin with at least ${MINT_FEE} MIST.` });

    const [feeCoin] = txb.splitCoins(txb.object(paymentCoin.coinObjectId), [txb.pure(MINT_FEE)]);

    txb.moveCall({
      target: `${PACKAGE_ID}::protocol::mint_attestation`,
      arguments: [
        txb.object(ADMIN_CAP_ID), txb.object(PROTOCOL_CONFIG_ID), feeCoin,
        txb.object(ATTESTATION_REGISTRY_ID), txb.object(policyObjectId), // use per-country policy here
        txb.pure(userWalletAddress), txb.pure(preparedData.jurisdictionCode),
        txb.pure(preparedData.verifierSource), txb.pure(preparedData.verificationLevel),
        // pass the nameHash explicitly as a vector<u8>
        txb.pure(preparedData.nameHash, 'vector<u8>'), txb.pure(preparedData.isHumanVerified),
        txb.pure(preparedData.isOver18), txb.pure(preparedData.verifierVersion),
      ],
    });

    txb.setSender(userWalletAddress);
    txb.setGasBudget(30000000);
    // Defensive: only set sponsor if sponsorKeypair is configured
    if (sponsorKeypair && typeof sponsorKeypair.getPublicKey === 'function') {
      txb.setSponsor(sponsorKeypair.getPublicKey().toSuiAddress());
    }

    const transactionBytes = await txb.build({ client: suiClient });
    const serializedTx = Buffer.from(transactionBytes).toString('base64');

    // Store pending mint info so the indexer can persist it on event
    pendingMints.set(userWalletAddress, { country, idNumber });
    verificationSessionStore.delete(sessionId);
    res.json({ transaction: serializedTx });
  } catch (error) {
    console.error('Error building transaction:', error);
    res.status(500).json({ error: 'Failed to build transaction.', details: error && error.message ? error.message : String(error) });
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
      onMessage: (event) => {
        // Be a bit defensive about payload shape
        const recipient =
          (event && event.payload && event.payload.recipient) ||
          (event && event.parsedJson && event.parsedJson.recipient) ||
          null;
        if (!recipient) return;

        const pendingMint = pendingMints.get(recipient);
        if (pendingMint) {
          try {
            db.markUsedGovId(pendingMint.country, pendingMint.idNumber, { walletAddress: recipient });
            console.log(`✅ SUCCESS: Permanently recorded ${pendingMint.country}:${pendingMint.idNumber} for wallet ${recipient}.`);
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

function startServer(port = START_PORT, attempts = 0) {
  if (attempts > MAX_RETRIES) {
    console.error(`Failed to bind server after ${MAX_RETRIES} retries. Exiting.`);
    process.exit(1);
  }

  try {
    server = app.listen(port, () => {
      console.log(`Server listening on port ${port}`);
      console.log(`Health: http://localhost:${port}/health`);
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

// add missing core requires used later
const fs = require('fs');
const path = require('path');

// helper to resolve per-country jurisdiction policy object id from env
function getPolicyId(countryKey) {
  if (!countryKey || typeof countryKey !== 'string') return null;

  // 1) Try a JSON map from env: JURISDICTION_POLICY_MAP='{"united states":"0xabc...", "kenya":"0xdef..."}'
  const mapRaw = process.env.JURISDICTION_POLICY_MAP;
  if (mapRaw) {
    try {
      const map = JSON.parse(mapRaw);
      if (map && typeof map === 'object' && map[countryKey]) return map[countryKey];
    } catch (e) {
      // ignore parse errors, fall through to other methods
      console.warn('Failed to parse JURISDICTION_POLICY_MAP:', e && e.message ? e.message : e);
    }
  }

  // 2) Try a per-country env var like JURISDICTION_POLICY_UNITED_STATES
  const envKey = 'JURISDICTION_POLICY_' + countryKey.toUpperCase().replace(/[^A-Z0-9]+/g, '_');
  if (process.env[envKey]) return process.env[envKey];

  // 3) Nothing found
  return null;
}

// POST /face-verify
app.post('/face-verify', async (req, res) => {
  // Guard early if Jimp isn't available or doesn't expose .read
  if (!Jimp || typeof Jimp.read !== 'function') {
    console.error('face-verify error: Jimp is not available or Jimp.read is not a function. Ensure "jimp" is installed and up-to-date.');
    return res.status(500).json({ success: false, error: 'Server misconfigured: image processing library (jimp) not available.' });
  }

  const { sessionId, livePhoto } = req.body;
  if (!sessionId || !livePhoto) return res.status(400).json({ success: false, error: 'sessionId and livePhoto are required' });

  const sessionData = verificationSessionStore.get(sessionId);
  if (!sessionData || !sessionData.govRecord) return res.status(404).json({ success: false, error: 'Verification session not found or invalid' });

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
    imgRef.resize(W, H);
    imgLive.resize(W, H);

    // perceptual distance 0..1 (lower = more similar), diff.percent 0..1 (lower = more similar)
    const perceptualDistance = Jimp.distance(imgRef, imgLive); // 0..1
    const diff = Jimp.diff(imgRef, imgLive); // { percent, image }

    const similarity = Math.max(0, 1 - perceptualDistance); // 0..1, higher=more similar
    const diffPercent = diff && typeof diff.percent === 'number' ? diff.percent : 1;

    // thresholds (tweak as needed)
    const MATCH_PERCEPTUAL_THRESHOLD = 0.30;
    const MATCH_DIFF_THRESHOLD = 0.20;

    const match = (perceptualDistance <= MATCH_PERCEPTUAL_THRESHOLD) && (diffPercent <= MATCH_DIFF_THRESHOLD);

    // persist face verification result in sessionData
    sessionData.faceVerification = {
      match,
      similarity: Number(similarity.toFixed(3)),
      diffPercent: Number(diffPercent.toFixed(3)),
      checkedAt: new Date().toISOString(),
    };
    verificationSessionStore.set(sessionId, sessionData);

    return res.json({
      success: true,
      match,
      similarity: Number(similarity.toFixed(3)),
      diffPercent: Number(diffPercent.toFixed(3))
    });
  } catch (e) {
    console.error('face-verify error:', e);
    return res.status(500).json({ success: false, error: 'Face verification failed on server' });
  }
});

// existing graceful shutdown code (leave unchanged)
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));