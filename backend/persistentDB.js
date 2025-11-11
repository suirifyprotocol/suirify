const fs = require('fs');
const path = require('path');
const { normalizeCountryKey } = require('./mockDB');
const DB_PATH = path.join(__dirname, 'db.json');

class PersistentDB {
  constructor() {
    this.data = {};
    this.load();
  }

  load() {
    try {
      if (fs.existsSync(DB_PATH)) {
        const fileContent = fs.readFileSync(DB_PATH, 'utf8');
        this.data = JSON.parse(fileContent);
        console.log(`Persistent DB loaded successfully from ${DB_PATH}`);
      } else {
        console.log('No existing DB file found. Starting with an empty database.');
        this.save();
      }
    } catch (error) {
      console.error('Failed to load or parse the database file. Starting fresh.', error);
      this.data = {};
    }
  }

  save() {
    try {
      fs.writeFileSync(DB_PATH, JSON.stringify(this.data, null, 2), 'utf8');
    } catch (error) {
      console.error('CRITICAL: Failed to save the database file!', error);
    }
  }

  // low-level helpers
  _makeKey(country, idNumber) {
    const c = normalizeCountryKey(country) || country || 'UNKNOWN';
    return `${c}:${idNumber}`;
  }

  has(key) {
    return key in this.data;
  }

  set(key, value) {
    this.data[key] = value;
    this.save();
  }

  get(key) {
    return this.data[key];
  }

  delete(key) {
    if (key in this.data) {
      delete this.data[key];
      this.save();
      return true;
    }
    return false;
  }

  // Higher-level, gov-id specific API

  /**
   * Check whether a government ID has been used to mint an attestation.
   * @param {string} country
   * @param {string} idNumber
   * @returns {boolean}
   */
  hasUsedGovId(country, idNumber) {
    const k = this._makeKey(country, idNumber);
    return this.has(k);
  }

  /**
   * Mark a government ID as used with optional metadata (e.g., attestationId, timestamp).
   * Returns the stored record.
   * @param {string} country
   * @param {string} idNumber
   * @param {object} metadata
   */
  markUsedGovId(country, idNumber, metadata = {}) {
    const k = this._makeKey(country, idNumber);
    const payload = Object.assign({
      country: normalizeCountryKey(country) || country,
      idNumber,
      markedAt: new Date().toISOString()
    }, metadata);
    this.set(k, payload);
    return payload;
  }

  /**
   * Retrieve stored metadata for a used government ID, or undefined if not present.
   * @param {string} country
   * @param {string} idNumber
   */
  getUsedGovId(country, idNumber) {
    const k = this._makeKey(country, idNumber);
    return this.get(k);
  }

  /**
   * Remove the record marking the gov ID as used.
   * @param {string} country
   * @param {string} idNumber
   * @returns {boolean} true if removed
   */
  removeUsedGovId(country, idNumber) {
    const k = this._makeKey(country, idNumber);
    return this.delete(k);
  }
}

module.exports = new PersistentDB();
