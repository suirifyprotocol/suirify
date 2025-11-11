const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config();
const { normalizeCountryKey } = require('./mockDB');

const DB_PATH = path.join(__dirname, 'db.json');
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
  if (metadata.requestId) sanitized.requestId = String(metadata.requestId);
    if (metadata.detectedAt) sanitized.detectedAt = String(metadata.detectedAt);
    if (metadata.recordedAt) sanitized.recordedAt = String(metadata.recordedAt);
    if (metadata.finalizedAt) sanitized.finalizedAt = String(metadata.finalizedAt);
  if (metadata.indexedAt) sanitized.indexedAt = String(metadata.indexedAt);
  if (metadata.requestTxDigest) sanitized.requestTxDigest = String(metadata.requestTxDigest);
  if (metadata.requestedRequestId) sanitized.requestedRequestId = String(metadata.requestedRequestId);
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

    this.data[key] = record;
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
}

module.exports = new PersistentDB();