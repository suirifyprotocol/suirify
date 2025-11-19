const fs = require('fs');
const path = require('path');

const govMockDB = {
    Nigeria: {
        'NGA-00000000000': {
            country: 'Nigeria',
            documentType: 'national_id',
            idNumber: 'NGA-00000000000',
            fullName: 'Suirify Devnet Test',
            givenName: 'Suirify Devnet',
            familyName: 'Test',
            dateOfBirth: '2010-01-01',
            gender: 'unspecified',
            nationality: 'Nigerian',
            address: 'Suirify Lab, Devnet',
            issuingAuthority: 'Suirify Test Authority',
            issuanceDate: '2024-01-01',
            expiryDate: null,
            photoReference: null,
            biometricHash: 'hash_suirify_devnet',
            mrz: null,
            barcodeData: 'barcode_suirify_devnet',
            additionalNotes: 'Internal record for automated testing'
        },
        'NGA-12345678901': {
            country: 'Nigeria',
            documentType: 'national_id',
            idNumber: 'NGA-12345678901',
            fullName: 'Sambo Flourish Simon',
            givenName: 'Sambo Flourish',
            familyName: 'Simon',
            dateOfBirth: '2000-01-18',
            gender: 'male',
            nationality: 'Nigerian',
            address: 'No. 12, Lagos Ave, Abuja',
            issuingAuthority: 'National Identity Management Commission',
            issuanceDate: '2018-06-01',
            expiryDate: null,
            photoReference: '/reference_photos/NGA-12345678901.jpg',
            biometricHash: 'hash_example_1',
            mrz: null,
            barcodeData: 'barcode_ng_123',
            additionalNotes: 'Verified against NIMC'
        },
        'NGA-10987654321': {
            country: 'Nigeria',
            documentType: 'national_id',
            idNumber: 'NGA-10987654321',
            fullName: 'Isaac Benedict',
            givenName: 'Isaac',
            familyName: 'Benedict',
            dateOfBirth: '2005-04-24',
            gender: 'male',
            nationality: 'Nigerian',
            address: 'Flat 2B, Ibadan Street, Oyo',
            issuingAuthority: 'National Identity Management Commission',
            issuanceDate: '2022-01-10',
            expiryDate: null,
            photoReference: '/reference_photos/NGA-10987654321',
            biometricHash: 'hash_example_2',
            mrz: null,
            barcodeData: 'barcode_ng_109',
            additionalNotes: 'Minor - parental consent on file'
        },
        'NGA-11223344556': {
            country: 'Nigeria',
            documentType: 'national_id',
            idNumber: 'NGA-11223344556',
            fullName: 'Bari-Domaka Pop-Yornwin',
            givenName: 'Bari-Domaka',
            familyName: 'Pop-Yornwin',
            dateOfBirth: '2006-10-10',
            gender: 'female',
            nationality: 'Nigerian',
            address: 'House 7, Port Harcourt Rd',
            issuingAuthority: 'National Identity Management Commission',
            issuanceDate: '2020-03-05',
            expiryDate: null,
            // Use a hosted avatar as the reference photo so the backend can fetch it
            photoReference: '/reference_photos/NGA-11223344556.png',
            biometricHash: 'hash_example_3',
            mrz: null,
            barcodeData: 'barcode_ng_112',
            additionalNotes: ''
        },
        'NGA-12345678902': {
            country: 'Nigeria',
            documentType: 'national_id',
            idNumber: 'NGA-12345678902',
            fullName: 'Jerome',
            givenName: 'Gozi',
            familyName: 'Yaro',
            dateOfBirth: '2006-11-05',
            gender: 'male',
            nationality: 'Nigerian',
            address: 'House 7, Port Harcourt Rd',
            issuingAuthority: 'National Identity Management Commission',
            issuanceDate: '2020-03-05',
            expiryDate: null,
            // Use a hosted avatar as the reference photo so the backend can fetch it
            photoReference: '/reference_photos/NGA-11223344556.png',
            biometricHash: 'hash_example_3',
            mrz: null,
            barcodeData: 'barcode_ng_112',
            additionalNotes: ''
        }
    },

    Ghana: {
        'GHA-123456789': {
            country: 'Ghana',
            documentType: 'passport',
            idNumber: 'GHA-123456789',
            fullName: 'Kwame Nkrumah',
            givenName: 'Kwame',
            familyName: 'Nkrumah',
            dateOfBirth: '1930-09-21',
            gender: 'male',
            nationality: 'Ghanaian',
            address: 'Accra, Ghana',
            issuingAuthority: 'Ghana Passport Office',
            issuanceDate: '1957-03-06',
            expiryDate: null,
            photoReference: '',
            biometricHash: 'hash_example_gh_1',
            mrz: 'P<GHA123456789<<<<<<<<<',
            barcodeData: 'barcode_gh_A123',
            additionalNotes: 'Historic record (example)'
        }
    },
    Kenya: {
        '12345678': {
            country: 'Kenya',
            documentType: 'Nationl ID',
            idNumber: '12345678',
            fullName: 'Jane Zuri',
            givenName: 'Jane',
            familyName: 'Zuri',
            dateOfBirth: '2009-09-21',
            gender: 'female',
            nationality: 'Kenyan',
            address: 'Nairobi, Kenya',
            issuingAuthority: 'Kenya National ID Authority',
            issuanceDate: '1957-03-06',
            expiryDate: null,
            photoReference: '',
            biometricHash: 'hash_example_gh_1',
            mrz: 'P<GHA123456789<<<<<<<<<',
            barcodeData: 'barcode_gh_A123',
            additionalNotes: 'Historic record (example)'
        }
    }
};

const govIdFields = [
    { key: 'country', description: 'Country issuing the ID' },
    { key: 'documentType', description: 'Type of document (e.g., national ID, passport, driver_license)' },
    { key: 'idNumber', description: 'Unique government-issued identifier' },
    { key: 'fullName', description: 'Full name as printed on the ID' },
    { key: 'givenName', description: 'Given/first name(s)' },
    { key: 'familyName', description: 'Surname/family name' },
    { key: 'dateOfBirth', description: 'Date of birth (YYYY-MM-DD)' },
    { key: 'gender', description: 'Gender/sex as recorded' },
    { key: 'nationality', description: 'Nationality' },
    { key: 'address', description: 'Address (may be partial or full)' },
    { key: 'issuingAuthority', description: 'Issuing authority/agency' },
    { key: 'issuanceDate', description: 'Date of issue' },
    { key: 'expiryDate', description: 'Date of expiry (if applicable)' },
    { key: 'photoReference', description: 'Photo path, URL, or reference ID' },
    { key: 'biometricHash', description: 'Optional biometric hash/fingerprint template' },
    { key: 'mrz', description: 'Machine-readable zone (for passports)' },
    { key: 'barcodeData', description: 'Barcode/QR data on card/document' },
    { key: 'additionalNotes', description: 'Any other notes, flags or verification metadata' }
];

// Lightweight schema for gov ID records (used for validation / form generation)
const govIdSchema = {
    type: 'object',
    required: ['country', 'documentType', 'idNumber', 'fullName', 'dateOfBirth'],
    properties: {
        country: { type: 'string' },
        documentType: { type: 'string' },
        idNumber: { type: 'string' },
        fullName: { type: 'string' },
        givenName: { type: 'string' },
        familyName: { type: 'string' },
        dateOfBirth: { type: 'string', format: 'date' }, // YYYY-MM-DD
        gender: { type: 'string' },
        nationality: { type: 'string' },
        address: { type: 'string' },
        issuingAuthority: { type: 'string' },
        issuanceDate: { type: 'string', format: 'date' },
        expiryDate: { type: ['string', 'null'], format: 'date' },
        photoReference: { type: ['string', 'null'] },
        biometricHash: { type: ['string', 'null'] },
        mrz: { type: ['string', 'null'] },
        barcodeData: { type: ['string', 'null'] },
        additionalNotes: { type: ['string', 'null'] }
    }
};

// Simple validator that checks presence of required fields and basic date format
function validateGovId(record) {
    const errors = [];
    if (!record || typeof record !== 'object') {
        return { valid: false, errors: ['record must be an object'] };
    }

    // required fields
    (govIdSchema.required || []).forEach((key) => {
        if (!(key in record) || record[key] === undefined || record[key] === null || record[key] === '') {
            errors.push(`missing required field: ${key}`);
        }
    });

    // basic date format check (YYYY-MM-DD) for relevant fields
    const dateFields = ['dateOfBirth', 'issuanceDate', 'expiryDate'];
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    dateFields.forEach((f) => {
        if (f in record && record[f] !== null && record[f] !== undefined && record[f] !== '') {
            if (typeof record[f] !== 'string' || !dateRegex.test(record[f])) {
                errors.push(`invalid date format for ${f}, expected YYYY-MM-DD`);
            }
        }
    });

    return { valid: errors.length === 0, errors };
}

// load reference photos from ./reference_photos and attach as data URLs to matching records
function loadReferencePhotos() {
  try {
    const photosDir = path.join(__dirname, 'reference_photos');
    if (!fs.existsSync(photosDir)) return;
    const files = fs.readdirSync(photosDir);

    for (const file of files) {
      const match = file.match(/^([A-Za-z]+)[_-](.+)\.(jpg|jpeg|png)$/i);
      if (!match) continue;

      const [, rawCountry, rawId] = match;
      const country = normalizeCountryKey(rawCountry);
      const fullPath = path.join(photosDir, file);

      if (!country || !govMockDB[country]) continue;

      // try exact id match first, then look for any key that endsWith or includes the rawId
      let targetKey = null;
      if (govMockDB[country][rawId]) {
        targetKey = rawId;
      } else {
        targetKey = Object.keys(govMockDB[country]).find(k =>
          k.toLowerCase() === rawId.toLowerCase() ||
          k.toLowerCase().endsWith(rawId.toLowerCase()) ||
          k.toLowerCase().includes(rawId.toLowerCase())
        );
      }

      if (targetKey) {
        const data = fs.readFileSync(fullPath);
        const ext = path.extname(file).slice(1).toLowerCase();
        const base64 = data.toString('base64');
        const dataUrl = `data:image/${ext};base64,${base64}`;
        govMockDB[country][targetKey].photoReference = dataUrl;
        console.log(`Loaded reference photo for ${country}/${targetKey}`);
      }
    }
  } catch (e) {
    console.warn('Error reading reference_photos directory', e);
  }
}

// Immediately load photos when the module is imported
loadReferencePhotos();

// New: normalize country key (case-insensitive)
function normalizeCountryKey(country) {
  if (!country || typeof country !== 'string') return country;
  // Keep original capitalization used in the DB (e.g., "Nigeria", "Ghana")
  const found = Object.keys(govMockDB).find(k => k.toLowerCase() === country.toLowerCase());
  return found || country;
}

function ensureCountryExists(country) {
  const key = normalizeCountryKey(country) || country;
  if (!govMockDB[key]) govMockDB[key] = {};
  return key;
}

function generateIdNumber(country) {
  const prefix = (country && country.slice(0,3).toUpperCase()) || 'ID';
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

// Add a new record (validates required fields). Returns the stored record or throws an Error.
function addGovRecord(country, record) {
  const key = ensureCountryExists(country);
  const rec = Object.assign({}, record);
  if (!rec.idNumber) rec.idNumber = generateIdNumber(key);
  const id = rec.idNumber;

  if (govMockDB[key][id]) {
    throw new Error(`record with idNumber ${id} already exists in ${key}`);
  }

  const validation = validateGovId(rec);
  if (!validation.valid) {
    throw new Error(`validation failed: ${validation.errors.join('; ')}`);
  }

  govMockDB[key][id] = rec;
  return govMockDB[key][id];
}

// Update an existing record (partial). Returns updated record or null if not found.
function updateGovRecord(country, idNumber, updates) {
  const key = normalizeCountryKey(country);
  if (!key || !govMockDB[key] || !govMockDB[key][idNumber]) return null;

  const updated = Object.assign({}, govMockDB[key][idNumber], updates);
  const validation = validateGovId(updated);
  if (!validation.valid) {
    throw new Error(`validation failed: ${validation.errors.join('; ')}`);
  }

  govMockDB[key][idNumber] = updated;
  return updated;
}

// Delete a record. Returns true if removed, false if not found.
function deleteGovRecord(country, idNumber) {
  const key = normalizeCountryKey(country);
  if (!key || !govMockDB[key] || !govMockDB[key][idNumber]) return false;
  delete govMockDB[key][idNumber];
  return true;
}

// Search records by query string across fields. If country omitted, searches all countries.
function searchGovRecords(query, country) {
  if (!query || typeof query !== 'string') return [];
  const q = query.toLowerCase();
  const results = [];

  const countryKeys = country ? [normalizeCountryKey(country)] : Object.keys(govMockDB);
  countryKeys.forEach((ck) => {
    if (!ck || !govMockDB[ck]) return;
    Object.values(govMockDB[ck]).forEach((rec) => {
      for (const v of Object.values(rec)) {
        if (v == null) continue;
        if (typeof v === 'string' && v.toLowerCase().includes(q)) {
          results.push(rec);
          return;
        }
      }
    });
  });

  return results;
}

// Persistence helpers: save to JSON and load from JSON (overwrites in-memory DB)
function saveMockDB(filePath) {
  const out = filePath || path.join(__dirname, 'govMockDB.json');
  try {
    fs.writeFileSync(out, JSON.stringify(govMockDB, null, 2), 'utf8');
    return out;
  } catch (e) {
    throw new Error(`failed to save mock DB: ${e.message}`);
  }
}

function loadMockDB(filePath) {
  const inPath = filePath || path.join(__dirname, 'govMockDB.json');
  if (!fs.existsSync(inPath)) {
    throw new Error(`file not found: ${inPath}`);
  }
  const raw = fs.readFileSync(inPath, 'utf8');
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    throw new Error('invalid JSON in mock DB file');
  }

  // Replace contents of govMockDB while keeping the same object reference
  Object.keys(govMockDB).forEach(k => delete govMockDB[k]);
  Object.keys(parsed).forEach(k => { govMockDB[k] = parsed[k]; });
  // reload photos after loading new data
  loadReferencePhotos();
  return true;
}

// Ensure a govLookup helper is defined and exported.
// Looks up a record by country (flexible key) and idNumber, returns the record or null.
function govLookup(country, idNumber) {
  if (!country || !idNumber) return null;
  const key = (typeof normalizeCountryKey === 'function') ? normalizeCountryKey(country) : country;
  if (!key || !govMockDB[key]) return null;

  const raw = String(idNumber).trim();

  // generate candidate id forms to try
  const candidates = new Set();

  // original input
  candidates.add(raw);

  // alphanumeric only (strip non-alnum)
  const alnum = raw.replace(/[^A-Za-z0-9]/g, '');
  if (alnum) candidates.add(alnum);

  // prefix (first 3 letters of country name) normalized
  const prefix = (key && String(key).slice(0,3).toUpperCase()) || null;
  if (prefix) {
    // if raw already has prefix (with or without dash), normalize to "XXX-..."
    const rePrefix = new RegExp(`^${prefix}-?`, 'i');
    if (rePrefix.test(raw)) {
      const remainder = raw.replace(rePrefix, '');
      const normalizedWithDash = `${prefix}-${remainder.replace(/[^A-Za-z0-9]/g,'')}`;
      candidates.add(normalizedWithDash);
      candidates.add(`${prefix}${remainder}`); // without dash
      candidates.add(remainder);
    } else {
      // try adding prefix variants
      candidates.add(`${prefix}-${raw}`);
      candidates.add(`${prefix}${raw}`);
      if (alnum) {
        candidates.add(`${prefix}-${alnum}`);
        candidates.add(`${prefix}${alnum}`);
      }
    }
  }

  // also try lower/upper variants
  Array.from(candidates).forEach(c => {
    candidates.add(String(c).toUpperCase());
    candidates.add(String(c).toLowerCase());
  });

  // try exact matches first
  for (const cand of candidates) {
    if (govMockDB[key][cand]) return govMockDB[key][cand];
  }

  // fallback: find any key that includes the numeric portion (useful if stored with prefix)
  const numeric = alnum;
  if (numeric) {
    const foundKey = Object.keys(govMockDB[key]).find(k =>
      k.replace(/[^A-Za-z0-9]/g,'').toLowerCase().endsWith(numeric.toLowerCase())
    );
    if (foundKey) return govMockDB[key][foundKey];
  }

  return null;
}

// Export existing and new helpers
module.exports = {
  govMockDB,
  govIdFields,
  govIdSchema,
  validateGovId,
  govLookup,
  // new exports
  normalizeCountryKey,
  addGovRecord,
  updateGovRecord,
  deleteGovRecord,
  searchGovRecords,
  saveMockDB,
  loadMockDB
};