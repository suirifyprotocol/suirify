const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');
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
const SPONSOR_PRIVATE_KEY = process.env.SPONSOR_PRIVATE_KEY;
const MINT_FEE = BigInt(process.env.MINT_FEE || 100000000);
const BYPASS_FACE_MATCH = process.env.BYPASS_FACE_MATCH !== 'false';

if (BYPASS_FACE_MATCH) {
  console.warn('Face verification bypass mode enabled — similarity checks will be skipped.');
}

console.log(`Sui network configured: ${SUI_NETWORK} (rpc: ${SUI_RPC})`);

let suiClient;
let sponsorKeypair;

// REPLACED: instantiate SuiClient when available; load sponsor keypair only if provided.
try {
	// Instantiate Sui client if constructor is available
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

	// Load sponsor keypair only when provided and supported
	if (SPONSOR_PRIVATE_KEY) {
    if (Ed25519Keypair && typeof Ed25519Keypair.fromSecretKey === 'function') {
      try {
        const tryLoadSponsorKeypair = (rawValue) => {
          // First try: assume the value is already in the sui bech32 / encoded format the SDK expects.
          try {
            return Ed25519Keypair.fromSecretKey(rawValue);
          } catch (err1) {
            // Fallback: attempt to treat as base64 encoded bytes (possibly prefixed with a scheme byte).
            try {
              const decoded = Buffer.from(rawValue, 'base64');
              let secretBytes;
              if (decoded.length === 33 && decoded[0] === 0) {
                // some exports prefix with 0 flag + 32 byte seed
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
        sponsorKeypair = tryLoadSponsorKeypair(SPONSOR_PRIVATE_KEY);
        console.log(`Sponsor address loaded: ${sponsorKeypair.getPublicKey().toSuiAddress()}`);
      } catch (e) {
        console.error('Failed to load SPONSOR_PRIVATE_KEY. Provide either a sui encoded secret key (suiprivkey...) or a base64 seed.', e);
        sponsorKeypair = null;
      }
		} else {
			console.warn('SPONSOR_PRIVATE_KEY provided but Ed25519Keypair helper not available. Sponsor will not be used.');
		}
	} else {
		console.info('No SPONSOR_PRIVATE_KEY provided. Transactions will be sponsor-less unless configured.');
	}

	// Inform about missing important env vars but do not prevent server start
	if (!PACKAGE_ID) {
		console.warn('PACKAGE_ID not set. On-chain mint operations will fail until PACKAGE_ID is configured.');
	}
	if (!ADMIN_CAP_ID || !PROTOCOL_CONFIG_ID || !ATTESTATION_REGISTRY_ID) {
		console.warn('One or more protocol env IDs (ADMIN_CAP_ID, PROTOCOL_CONFIG_ID, ATTESTATION_REGISTRY_ID) are not set. Some on-chain calls may fail.');
	}
} catch (outerErr) {
	console.error('Unexpected error during Sui client / sponsor initialization:', outerErr);
	suiClient = null;
	sponsorKeypair = null;
}

const verificationSessionStore = new Map();
const pendingMints = new Map();
const pendingSponsoredTransactions = new Map();
let cachedAdminOwnerAddress = null;
let adminOwnerCheckError = null;

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

  if (!sponsorKeypair) {
    console.warn('create-mint-tx called but sponsor keypair is not configured.');
    return res.status(500).json({ error: 'Sponsor account not configured on the server.' });
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
    if (!TransactionBlock || typeof TransactionBlock !== 'function') {
      console.error('TransactionBlock constructor not available. Ensure @mysten/sui is up to date.');
      return res.status(500).json({ error: 'Sui transaction builder not available on the server.' });
    }

    const txb = new TransactionBlock();
    const sponsorAddress = sponsorKeypair.getPublicKey().toSuiAddress();

    if (!cachedAdminOwnerAddress && !adminOwnerCheckError) {
      try {
        const adminObject = await suiClient.getObject({ id: ADMIN_CAP_ID, options: { showOwner: true } });
        cachedAdminOwnerAddress = adminObject?.data?.owner?.AddressOwner || null;
      } catch (ownerErr) {
        adminOwnerCheckError = ownerErr;
        console.warn('Unable to determine ADMIN_CAP owner:', ownerErr?.message || ownerErr);
      }
    }

    if (cachedAdminOwnerAddress && cachedAdminOwnerAddress !== sponsorAddress) {
      return res.status(500).json({
        error: 'Admin capability is not owned by the configured sponsor account.',
        details: {
          adminOwner: cachedAdminOwnerAddress,
          sponsorAddress,
        },
      });
    }

    const sponsorCoins = await suiClient.getCoins({ owner: sponsorAddress, coinType: '0x2::sui::SUI', limit: 50 });
    if (!sponsorCoins || !Array.isArray(sponsorCoins.data) || sponsorCoins.data.length === 0) {
      return res.status(500).json({ error: 'Sponsor account does not hold any SUI coins to cover minting.' });
    }

    const sortedCoins = [...sponsorCoins.data].sort((a, b) => {
      const balanceA = BigInt(a.balance);
      const balanceB = BigInt(b.balance);
      if (balanceA === balanceB) return 0;
      return balanceA > balanceB ? -1 : 1;
    });
    const gasCoin = sortedCoins[0];
    const paymentCoin = sortedCoins[1];

    if (!paymentCoin) {
      return res.status(500).json({ error: 'Sponsor account needs at least two SUI coins (one for gas, one for mint fee). Split a coin and retry.' });
    }

    txb.setGasOwner(sponsorAddress);
    txb.setGasPayment([
      {
        objectId: gasCoin.coinObjectId,
        digest: gasCoin.digest,
        version: gasCoin.version,
      },
    ]);

    const feeAmount = typeof MINT_FEE === 'bigint' ? MINT_FEE.toString() : String(MINT_FEE);
    const [feeCoin] = txb.splitCoins(txb.object(paymentCoin.coinObjectId), [txb.pure.u64(feeAmount)]);

    const nameHashVector = typeof txb.pure.vector === 'function'
      ? txb.pure.vector('u8', Array.from(preparedData.nameHash))
      : txb.pure(Array.from(preparedData.nameHash));

    txb.moveCall({
      target: `${PACKAGE_ID}::protocol::mint_attestation`,
      arguments: [
        txb.object(ADMIN_CAP_ID), txb.object(PROTOCOL_CONFIG_ID), feeCoin,
        txb.object(ATTESTATION_REGISTRY_ID), txb.object(policyObjectId), // use per-country policy here
        txb.pure.address(userWalletAddress), txb.pure.u16(Number(preparedData.jurisdictionCode)),
        txb.pure.u8(preparedData.verifierSource), txb.pure.u8(preparedData.verificationLevel),
        // pass the nameHash explicitly as a vector<u8>
        nameHashVector, txb.pure.bool(preparedData.isHumanVerified),
        txb.pure.bool(preparedData.isOver18), txb.pure.u8(preparedData.verifierVersion),
      ],
    });

    txb.setSender(userWalletAddress);
    txb.setGasBudget(30000000);

    const transactionBytes = await txb.build({ client: suiClient });
    const serializedTx = Buffer.from(transactionBytes).toString('base64');

    pendingSponsoredTransactions.set(sessionId, {
      transaction: serializedTx,
      userWalletAddress,
      country,
      idNumber,
      sponsorAddress,
      createdAt: Date.now(),
    });

    res.json({ success: true, transaction: serializedTx, sponsorAddress });
  } catch (error) {
    console.error('Error building transaction:', error);
    res.status(500).json({ success: false, error: 'Failed to build transaction.', details: error && error.message ? error.message : String(error) });
  }
});

app.post('/submit-mint-signature', async (req, res) => {
  const { sessionId, userSignature, transaction } = req.body;
  if (!sessionId || !userSignature) {
    return res.status(400).json({ error: 'sessionId and userSignature are required.' });
  }

  if (!suiClient) {
    console.warn('submit-mint-signature called but suiClient is not configured.');
    return res.status(500).json({ error: 'Sui client is not configured on the server.' });
  }

  if (!sponsorKeypair) {
    console.warn('submit-mint-signature called but sponsor keypair is not configured.');
    return res.status(500).json({ error: 'Sponsor account not configured on the server.' });
  }

  const pending = pendingSponsoredTransactions.get(sessionId);
  if (!pending) {
    return res.status(404).json({ error: 'No pending sponsored transaction found for this session.' });
  }

  const { transaction: storedTx, userWalletAddress, country, idNumber } = pending;
  if (transaction && transaction !== storedTx) {
    return res.status(400).json({ error: 'Provided transaction does not match pending transaction. Please restart the mint step.' });
  }

  const txBase64 = storedTx;
  const txBytes = Buffer.from(txBase64, 'base64');

  try {
    async function trySign(methodName, arg) {
      const fn = sponsorKeypair && sponsorKeypair[methodName];
      if (typeof fn !== 'function') return null;
      try {
        const result = fn.call(sponsorKeypair, arg);
        return result && typeof result.then === 'function' ? await result : result;
      } catch (err) {
        console.warn(`Sponsor keypair ${methodName} failed:`, err && err.message ? err.message : err);
        return null;
      }
    }

    let signaturePayload = await trySign('signTransactionBlock', txBytes);
    if (!signaturePayload) {
      signaturePayload = await trySign('signTransaction', txBytes);
    }
    if (!signaturePayload) {
      signaturePayload = await trySign('signTransaction', txBase64);
    }
    if (!signaturePayload) {
      signaturePayload = await trySign('sign', txBytes);
    }

    if (!signaturePayload) {
      throw new Error('Sponsor keypair does not support transaction signing with the available methods.');
    }

    let sponsorSignature = signaturePayload.signature ?? signaturePayload;
    if (Array.isArray(sponsorSignature)) {
      sponsorSignature = sponsorSignature[0];
    }
    if (sponsorSignature instanceof Uint8Array) {
      sponsorSignature = Buffer.from(sponsorSignature).toString('base64');
    }
    if (typeof sponsorSignature !== 'string') {
      throw new Error('Unsupported sponsor signature format returned by keypair.');
    }

    const executionResult = await suiClient.executeTransactionBlock({
      transactionBlock: txBase64,
      signature: [userSignature, sponsorSignature],
      options: { showEffects: true, showEvents: true },
      requestType: 'WaitForLocalExecution',
    });

    const digest = executionResult?.digest || executionResult?.effects?.transactionDigest || null;

    pendingMints.set(userWalletAddress, { country, idNumber });
    pendingSponsoredTransactions.delete(sessionId);
    verificationSessionStore.delete(sessionId);

    res.json({ success: true, digest, effects: executionResult?.effects ?? null });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Failed to execute sponsored transaction:', message);
    res.status(500).json({ success: false, error: 'Failed to execute sponsored transaction.', details: message });
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