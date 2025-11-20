const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config();
const { normalizeCountryKey } = require('./mockDB');

const DB_PATH = path.join(__dirname, 'data', 'db.json');
const SECRET_PEPPER = process.env.SECRET_PEPPER || '';
const LOG_LIMIT = Number(process.env.DB_LOG_LIMIT || 500);
const GOV_HISTORY_LIMIT = Number(process.env.DB_HISTORY_LIMIT || 200);
const MINT_HISTORY_LIMIT = Number(process.env.DB_MINT_HISTORY_LIMIT || 200);

const nowIso = () => new Date().toISOString();

const hashWithPepper = (namespace, ...parts) => {
  const payload = [namespace, ...parts, SECRET_PEPPER].map((part) => {
    if (part === null || part === undefined) return '';
    return String(part).trim();
  }).join('|');
  return crypto.createHash('sha256').update(payload, 'utf8').digest('hex');
};

const normalizeNameForHash = (name) => {
  if (!name || typeof name !== 'string') return '';
  const nfkc = name.normalize('NFKC');
  const stripped = nfkc.replace(/\p{M}/gu, '');
  return stripped.trim().toLowerCase().replace(/\s+/g, ' ');
};

const hashFullName = (name) => {
  const normalized = normalizeNameForHash(name);
  if (!normalized) return null;
  return hashWithPepper('full-name:v1', normalized);
};

const hashNote = (note) => {
  if (!note || typeof note !== 'string') return null;
  return hashWithPepper('note:v1', note);
};

const hashGovIdComponents = (country, idNumber) => {
  const normalizedCountry = normalizeCountryKey(country) || (country ? String(country).trim().toLowerCase() : 'unknown');
  const idValue = idNumber === null || idNumber === undefined ? '' : String(idNumber).trim();
  const idHash = hashWithPepper('gov-id:v1', normalizedCountry, idValue);
  return { normalizedCountry, idHash };
};

const normalizeWalletAddress = (wallet) => {
  if (!wallet || typeof wallet !== 'string') return null;
  const trimmed = wallet.trim();
  if (!trimmed) return null;
  return trimmed.toLowerCase();
};

class PersistentDB {
  constructor() {
    this.data = {};
    this.load();
  }

  load() {
    try {
      if (fs.existsSync(DB_PATH)) {
        const fileContent = fs.readFileSync(DB_PATH, 'utf8').trim();
        if (fileContent) {
          this.data = JSON.parse(fileContent);
          console.log(`Persistent DB loaded successfully from ${DB_PATH}`);
        } else {
          this.data = {};
        }
      } else {
        console.log('No existing DB file found. Starting with an empty database.');
        this.data = {};
      }
    } catch (error) {
      console.error('Failed to load or parse the database file. Starting fresh.', error);
      this.data = {};
    }
    this._ensureStructures();
    this._rebuildWalletIndex();
    this._touchMeta('lastLoadedAt');
    this.save();
  }

  save() {
    try {
      this._ensureStructures();
      this._touchMeta('lastPersistedAt');
      fs.writeFileSync(DB_PATH, JSON.stringify(this.data, null, 2), 'utf8');
    } catch (error) {
      console.error('CRITICAL: Failed to save the database file!', error);
    }
  }

  _ensureStructures() {
    if (!this.data || typeof this.data !== 'object' || Array.isArray(this.data)) {
      this.data = {};
    }
    if (!Array.isArray(this.data.__log)) {
      this.data.__log = [];
    }
    if (!this.data.__meta || typeof this.data.__meta !== 'object' || Array.isArray(this.data.__meta)) {
      this.data.__meta = { schemaVersion: 2, createdAt: nowIso() };
    }
    if (!this.data.__walletIndex || typeof this.data.__walletIndex !== 'object' || Array.isArray(this.data.__walletIndex)) {
      this.data.__walletIndex = {};
    }
  }

  _clearWalletIndex() {
    this._ensureStructures();
    this.data.__walletIndex = {};
  }

  _addWalletIndexEntry(walletAddress, key) {
    const normalized = normalizeWalletAddress(walletAddress);
    if (!normalized || !key) return;
    this._ensureStructures();
    if (!Array.isArray(this.data.__walletIndex[normalized])) {
      this.data.__walletIndex[normalized] = [];
    }
    if (!this.data.__walletIndex[normalized].includes(key)) {
      this.data.__walletIndex[normalized].push(key);
    }
  }

  _removeWalletIndexEntry(key) {
    this._ensureStructures();
    const index = this.data.__walletIndex;
    Object.keys(index).forEach((wallet) => {
      const list = index[wallet];
      if (!Array.isArray(list)) return;
      const next = list.filter((entry) => entry !== key);
      if (next.length !== list.length) {
        if (next.length) {
          index[wallet] = next;
        } else {
          delete index[wallet];
        }
      }
    });
  }

  _updateWalletIndexForRecord(key, record) {
    if (!key || !record) return;
    this._removeWalletIndexEntry(key);
    const wallets = Array.isArray(record.wallets) ? record.wallets : [];
    wallets.forEach((wallet) => this._addWalletIndexEntry(wallet, key));
    if (record.walletAddress) {
      this._addWalletIndexEntry(record.walletAddress, key);
    }
  }

  _rebuildWalletIndex() {
    this._clearWalletIndex();
    Object.keys(this.data).forEach((key) => {
      if (!key.startsWith('gov:')) return;
      const record = this.data[key];
      if (!record || typeof record !== 'object') return;
      this._updateWalletIndexForRecord(key, record);
    });
  }

  _touchMeta(field, value) {
    this._ensureStructures();
    const timestamp = value || nowIso();
    this.data.__meta[field] = timestamp;
    return timestamp;
  }

  _appendLog(type, details = {}) {
    this._ensureStructures();
    const allowed = ['country', 'idHash', 'walletAddress', 'attestationId', 'requestId', 'eventType', 'source', 'noteHash'];
    const safeDetails = {};
    allowed.forEach((key) => {
      if (details[key] !== undefined && details[key] !== null) {
        safeDetails[key] = details[key];
      }
    });
    this.data.__log.push(Object.assign({ timestamp: nowIso(), type }, safeDetails));
    if (this.data.__log.length > LOG_LIMIT) {
      this.data.__log = this.data.__log.slice(-LOG_LIMIT);
    }
  }

  has(key) {
    this._ensureStructures();
    return Object.prototype.hasOwnProperty.call(this.data, key);
  }

  set(key, value) {
    this._ensureStructures();
    this.data[key] = value;
    this.save();
  }

  get(key) {
    this._ensureStructures();
    return this.data[key];
  }

  // Higher-level, gov-id specific API

  _makeKey(country, idNumber) {
    const { normalizedCountry, idHash } = hashGovIdComponents(country, idNumber);
    return `gov:${normalizedCountry}:${idHash}`;
  }

  _sanitizeGovMetadata(metadata = {}) {
    const sanitized = { metadataVersion: 2 };
    if (!metadata || typeof metadata !== 'object') {
      sanitized.eventType = 'update';
      return sanitized;
    }

    if (metadata.walletAddress) sanitized.walletAddress = String(metadata.walletAddress);
    if (metadata.attestationId) sanitized.attestationId = String(metadata.attestationId);
    if (metadata.requestId) sanitized.requestId = String(metadata.requestId);
    if (metadata.originalRequestId) sanitized.originalRequestId = String(metadata.originalRequestId);
    if (metadata.finalizeDigest) sanitized.finalizeDigest = String(metadata.finalizeDigest);
    if (metadata.finalizeTxDigest) sanitized.finalizeTxDigest = String(metadata.finalizeTxDigest);
    if (metadata.requestTxDigest) sanitized.requestTxDigest = String(metadata.requestTxDigest);
    if (metadata.mintDigest) sanitized.mintDigest = String(metadata.mintDigest);
    if (metadata.mintRequestDigest) sanitized.mintRequestDigest = String(metadata.mintRequestDigest);
    if (metadata.mintRequestId) sanitized.mintRequestId = String(metadata.mintRequestId);
    if (metadata.detectedAt) sanitized.detectedAt = String(metadata.detectedAt);
    if (metadata.recordedAt) sanitized.recordedAt = String(metadata.recordedAt);
    if (metadata.finalizedAt) sanitized.finalizedAt = String(metadata.finalizedAt);
    if (metadata.indexedAt) sanitized.indexedAt = String(metadata.indexedAt);
    if (metadata.requestTxDigest) sanitized.requestTxDigest = String(metadata.requestTxDigest);
    if (metadata.requestedRequestId) sanitized.requestedRequestId = String(metadata.requestedRequestId);
    if (metadata.status) sanitized.status = String(metadata.status);
    if (metadata.statusLabel) sanitized.statusLabel = String(metadata.statusLabel);
    if (metadata.statusCode !== undefined && metadata.statusCode !== null) sanitized.statusCode = Number(metadata.statusCode);
    if (metadata.jurisdictionCode !== undefined && metadata.jurisdictionCode !== null) sanitized.jurisdictionCode = Number(metadata.jurisdictionCode);
    if (metadata.verificationLevel !== undefined && metadata.verificationLevel !== null) sanitized.verificationLevel = Number(metadata.verificationLevel);
    if (metadata.issueDateMs !== undefined && metadata.issueDateMs !== null) sanitized.issueDateMs = Number(metadata.issueDateMs);
    if (metadata.expiryDateMs !== undefined && metadata.expiryDateMs !== null) sanitized.expiryDateMs = Number(metadata.expiryDateMs);
    if (metadata.source) sanitized.source = String(metadata.source);
    if (metadata.eventType) sanitized.eventType = String(metadata.eventType);
    if (metadata.fullNameHash) sanitized.fullNameHash = String(metadata.fullNameHash);
    if (metadata.fullName && !sanitized.fullNameHash) {
      const hash = hashFullName(metadata.fullName);
      if (hash) sanitized.fullNameHash = hash;
    }
    if (metadata.note) {
      const noteHash = hashNote(metadata.note);
      if (noteHash) {
        sanitized.noteHash = noteHash;
        sanitized.hasNote = true;
      }
    }

    const allowedBoolKeys = ['isHumanVerified', 'isOver18'];
    allowedBoolKeys.forEach((key) => {
      if (metadata[key] !== undefined) sanitized[key] = Boolean(metadata[key]);
    });

    Object.keys(metadata).forEach((key) => {
      if (key.toLowerCase().includes('name')) return;
      if (key.toLowerCase().includes('idnumber')) return;
      if (!(key in sanitized) && (typeof metadata[key] === 'number' || typeof metadata[key] === 'boolean')) {
        sanitized[key] = metadata[key];
      }
    });

    if (!sanitized.eventType) sanitized.eventType = 'update';
    return sanitized;
  }

  hasUsedGovId(country, idNumber) {
    const key = this._makeKey(country, idNumber);
    return this.has(key);
  }

  markUsedGovId(country, idNumber, metadata = {}) {
    const { normalizedCountry, idHash } = hashGovIdComponents(country, idNumber);
    const key = this._makeKey(country, idNumber);
    const now = nowIso();
    const existing = this.get(key) || null;
    const sanitizedMeta = this._sanitizeGovMetadata(metadata);
    const historyEntry = Object.assign({ timestamp: now }, sanitizedMeta);

    const record = existing ? Object.assign({}, existing) : {
      country: normalizedCountry,
      idHash,
      firstSeenAt: now,
      history: [],
      wallets: [],
    };

    record.country = normalizedCountry;
    record.idHash = idHash;
    record.lastUpdatedAt = now;
    if (!Array.isArray(record.wallets)) record.wallets = [];
    if (sanitizedMeta.walletAddress) {
      record.walletAddress = sanitizedMeta.walletAddress;
      if (!record.wallets.includes(sanitizedMeta.walletAddress)) {
        record.wallets.push(sanitizedMeta.walletAddress);
      }
    }
    if (sanitizedMeta.fullNameHash) {
      record.fullNameHash = sanitizedMeta.fullNameHash;
    }
    if (!Array.isArray(record.history)) record.history = [];
    record.history.push(historyEntry);
    if (record.history.length > GOV_HISTORY_LIMIT) {
      record.history = record.history.slice(-GOV_HISTORY_LIMIT);
    }
    record.latest = sanitizedMeta;
    record.totalEvents = record.history.length;
    if (sanitizedMeta.attestationId) {
      record.attestationId = sanitizedMeta.attestationId;
    }

    this.data[key] = record;
    this._updateWalletIndexForRecord(key, record);
    this._appendLog('govId.marked', {
      country: normalizedCountry,
      idHash,
      walletAddress: sanitizedMeta.walletAddress || null,
      attestationId: sanitizedMeta.attestationId || null,
      requestId: sanitizedMeta.requestId || sanitizedMeta.originalRequestId || null,
      eventType: sanitizedMeta.eventType || null,
      source: sanitizedMeta.source || null,
      noteHash: sanitizedMeta.noteHash || null,
    });
    this.save();
    return record;
  }

  getUsedGovId(country, idNumber) {
    const key = this._makeKey(country, idNumber);
    return this.get(key);
  }

  removeUsedGovId(country, idNumber) {
    const { normalizedCountry, idHash } = hashGovIdComponents(country, idNumber);
    const key = this._makeKey(country, idNumber);
    if (!this.has(key)) return false;
    this._removeWalletIndexEntry(key);
    delete this.data[key];
    this._appendLog('govId.removed', { country: normalizedCountry, idHash });
    this.save();
    return true;
  }

  // Mint request tracking

  _requestKey(requestId) {
    if (!requestId) return null;
    return `mintRequest:${String(requestId).toLowerCase()}`;
  }

  _sanitizeMintMetadata(metadata = {}) {
    const sanitized = this._sanitizeGovMetadata(metadata);
    if (metadata.consumedAt) sanitized.consumedAt = String(metadata.consumedAt);
    if (metadata.indexedAt) sanitized.indexedAt = String(metadata.indexedAt);
    if (metadata.recipient) sanitized.recipient = String(metadata.recipient);
    if (!sanitized.eventType || sanitized.eventType === 'update') sanitized.eventType = 'consumed';
    return sanitized;
  }

  markMintRequestConsumed(requestId, metadata = {}) {
    const key = this._requestKey(requestId);
    if (!key) return null;
    const now = nowIso();
    const existing = this.get(key) || null;
    const sanitizedMeta = this._sanitizeMintMetadata(metadata);
    const historyEntry = Object.assign({ timestamp: now }, sanitizedMeta);

    const record = existing ? Object.assign({}, existing) : {
      requestId: String(requestId),
      firstSeenAt: now,
      history: [],
      wallets: [],
    };

    record.lastUpdatedAt = now;
    if (!Array.isArray(record.history)) record.history = [];
    record.history.push(historyEntry);
    if (record.history.length > MINT_HISTORY_LIMIT) {
      record.history = record.history.slice(-MINT_HISTORY_LIMIT);
    }
    record.latest = sanitizedMeta;
    if (sanitizedMeta.walletAddress) {
      record.walletAddress = sanitizedMeta.walletAddress;
      if (!Array.isArray(record.wallets)) record.wallets = [];
      if (!record.wallets.includes(sanitizedMeta.walletAddress)) {
        record.wallets.push(sanitizedMeta.walletAddress);
      }
    }

    this.data[key] = record;
    this._appendLog('mintRequest.consumed', {
      requestId: record.requestId,
      walletAddress: sanitizedMeta.walletAddress || null,
      eventType: sanitizedMeta.eventType || null,
      source: sanitizedMeta.source || null,
      noteHash: sanitizedMeta.noteHash || null,
      attestationId: sanitizedMeta.attestationId || null,
    });
    this.save();
    return record;
  }

  isMintRequestConsumed(requestId) {
    const key = this._requestKey(requestId);
    if (!key) return false;
    return this.has(key);
  }

  getConsumedMintRequest(requestId) {
    const key = this._requestKey(requestId);
    if (!key) return undefined;
    return this.get(key);
  }

  getAllConsumedMintRequests() {
    this._ensureStructures();
    const prefix = 'mintRequest:';
    return Object.keys(this.data)
      .filter((k) => k.startsWith(prefix))
      .map((k) => this.data[k])
      .filter(Boolean);
  }

  getAttestationByWallet(walletAddress) {
    this._ensureStructures();
    const normalized = normalizeWalletAddress(walletAddress);
    if (!normalized) return null;
    const index = this.data.__walletIndex || {};
    const keys = Array.isArray(index[normalized]) ? index[normalized] : null;
    if (!keys || !keys.length) return null;

    let best = null;
    let bestKey = null;

    keys.forEach((key) => {
      const record = this.data[key];
      if (!record || typeof record !== 'object') return;
      const last = record.lastUpdatedAt || (record.latest && record.latest.recordedAt) || (record.history && record.history.length ? record.history[record.history.length - 1].timestamp : null);
      const lastMs = last ? Date.parse(last) : 0;
      if (!best || lastMs > best.lastMs) {
        best = { record, lastMs };
        bestKey = key;
      }
    });

    if (!bestKey || !best) return null;
    return { key: bestKey, record: best.record };
  }

  getAttestationSummaryForWallet(walletAddress) {
    const hit = this.getAttestationByWallet(walletAddress);
    if (!hit) return null;
    const { key, record } = hit;
    if (!record || typeof record !== 'object') return null;
    const latest = record.latest || {};
    const statusCode = latest.statusCode !== undefined ? latest.statusCode : latest.status;
    const normalizedStatusCode = typeof statusCode === 'number' ? statusCode : undefined;
    const status = latest.status || (typeof statusCode === 'string' ? statusCode : null);
    const result = {
      key,
      walletAddress: latest.walletAddress || record.walletAddress || null,
      attestationId: record.attestationId || latest.attestationId || null,
      jurisdictionCode: latest.jurisdictionCode ?? null,
      verificationLevel: latest.verificationLevel ?? null,
      issueDateMs: latest.issueDateMs ?? null,
      expiryDateMs: latest.expiryDateMs ?? null,
      status,
      statusLabel: latest.statusLabel || (typeof status === 'string' ? status : null),
      statusCode: normalizedStatusCode ?? (typeof status === 'number' ? status : null),
      fullNameHash: record.fullNameHash || latest.fullNameHash || null,
      source: latest.source || null,
      record,
    };
    return result;
  }
}

module.exports = new PersistentDB();