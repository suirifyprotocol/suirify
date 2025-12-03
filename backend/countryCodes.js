// List of 20 African countries with ISO-3166 numeric codes and simple lookup helpers
const COUNTRIES = [
  { name: 'Nigeria', localName: 'Nigeria', iso: 566, alpha2: 'NG', alpha3: 'NGA' },
  { name: 'United States', localName: 'United States', iso: 840, alpha2: 'US', alpha3: 'USA' },
  { name: 'South Africa', localName: 'South Africa', iso: 710, alpha2: 'ZA', alpha3: 'ZAF' },
  { name: 'India', localName: 'India', iso: 356, alpha2: 'IN', alpha3: 'IND' },
  { name: 'Ghana', localName: 'Ghana', iso: 288, alpha2: 'GH', alpha3: 'GHA' },
  { name: 'Canada', localName: 'Canada', iso: 124, alpha2: 'CA', alpha3: 'CAN' },
  { name: 'United Kingdom (UK)', localName: 'United Kingdom (UK)', iso: 826, alpha2: 'GB', alpha3: 'GBR' },
  { name: 'China', localName: 'China', iso: 156, alpha2: 'CN', alpha3: 'CHN' },
  { name: 'Japan', localName: 'Japan', iso: 392, alpha2: 'JP', alpha3: 'JPN' },
  { name: 'Germany', localName: 'Germany', iso: 276, alpha2: 'DE', alpha3: 'DEU' },
  { name: 'France', localName: 'France', iso: 250, alpha2: 'FR', alpha3: 'FRA' },
  { name: 'Brazil', localName: 'Brazil', iso: 76, alpha2: 'BR', alpha3: 'BRA' },
  { name: 'Australia', localName: 'Australia', iso: 36, alpha2: 'AU', alpha3: 'AUS' },
  { name: 'Kenya', localName: 'Republic of Kenya', iso: 404, alpha2: 'KE', alpha3: 'KEN' }
];

// normalize names for lookup (case-insensitive, trim)
function _normalize(name) {
  if (name === null || name === undefined) return '';
  return String(name).trim().toLowerCase();
}

// helper: alpha-2 (e.g., "NG") -> regional indicator emoji 🇳🇬
function alpha2ToEmoji(alpha2) {
  if (!alpha2 || typeof alpha2 !== 'string' || alpha2.length !== 2) return '';
  return alpha2
    .toUpperCase()
    .split('')
    .map((c) => String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65))
    .join('');
}

/**
 * Resolve ISO-3166 numeric code by flexible identifier:
 * - exact country name (case-insensitive)
 * - localName
 * - alpha-2 or alpha-3 code (case-insensitive)
 * - numeric string equal to iso
 */
function getIsoCode(countryIdentifier) {
  if (countryIdentifier === null || countryIdentifier === undefined) return null;
  const input = String(countryIdentifier).trim();
  const lower = _normalize(input);

  // direct numeric match
  if (/^\d+$/.test(input)) {
    const n = Number(input);
    const foundByNum = COUNTRIES.find(c => c.iso === n);
    if (foundByNum) return foundByNum.iso;
  }

  // alpha-2/alpha-3 match
  const byAlpha = COUNTRIES.find(
    c => _normalize(c.alpha2) === lower || _normalize(c.alpha3) === lower
  );
  if (byAlpha) return byAlpha.iso;

  // name/localName match
  const byName = COUNTRIES.find(
    c => _normalize(c.name) === lower || _normalize(c.localName) === lower
  );
  if (byName) return byName.iso;

  return null;
}

// return shallow copy with rich metadata including icon and emoji
function getCountryList() {
  return COUNTRIES.map((c) => {
    const a2 = (c.alpha2 || '').toLowerCase();
    const flagPng = a2 ? `https://flagcdn.com/w80/${a2}.png` : null; // small PNG
    const flagSvg = a2 ? `https://flagcdn.com/${a2}.svg` : null; // SVG
    return {
      name: c.name,
      localName: c.localName,
      iso: c.iso,
      alpha2: c.alpha2,
      alpha3: c.alpha3,
      // frontend-friendly fields:
      label: c.localName && c.localName.length ? c.localName : c.name,
      iconUrl: flagPng,   // preferred display URL (frontend may choose svg)
      iconSvg: flagSvg,
      emoji: alpha2ToEmoji(c.alpha2),
    };
  });
}

module.exports = {
  COUNTRIES,
  getIsoCode,
  getCountryList
};
