// List of 20 African countries with ISO-3166 numeric codes and simple lookup helpers
const COUNTRIES = [
    { name: 'Nigeria', localName: 'Nigeria', iso: 566, alpha2: 'NG', alpha3: 'NGA' },
    { name: 'Ghana', localName: 'Ghana', iso: 288, alpha2: 'GH', alpha3: 'GHA' },
    { name: 'Kenya', localName: 'Kenya', iso: 404, alpha2: 'KE', alpha3: 'KEN' },
    { name: 'South Africa', localName: 'South Africa', iso: 710, alpha2: 'ZA', alpha3: 'ZAF' },
    { name: 'Egypt', localName: 'مصر (Egypt)', iso: 818, alpha2: 'EG', alpha3: 'EGY' },
    { name: 'Morocco', localName: 'Morocco', iso: 504, alpha2: 'MA', alpha3: 'MAR' },
    { name: 'Algeria', localName: 'Algérie', iso: 12, alpha2: 'DZ', alpha3: 'DZA' },
    { name: 'Tunisia', localName: 'Tunisia', iso: 788, alpha2: 'TN', alpha3: 'TUN' },
    { name: 'Ethiopia', localName: 'Ethiopia', iso: 231, alpha2: 'ET', alpha3: 'ETH' },
    { name: 'Uganda', localName: 'Uganda', iso: 800, alpha2: 'UG', alpha3: 'UGA' },
    { name: 'Tanzania', localName: 'Tanzania', iso: 834, alpha2: 'TZ', alpha3: 'TZA' },
    { name: 'Rwanda', localName: 'Rwanda', iso: 646, alpha2: 'RW', alpha3: 'RWA' },
    { name: 'Burundi', localName: 'Burundi', iso: 108, alpha2: 'BI', alpha3: 'BDI' },
    { name: 'Senegal', localName: 'Sénégal', iso: 686, alpha2: 'SN', alpha3: 'SEN' },
    { name: 'Cameroon', localName: 'Cameroon', iso: 120, alpha2: 'CM', alpha3: 'CMR' },
    { name: "Côte d'Ivoire", localName: "Côte d'Ivoire", iso: 384, alpha2: 'CI', alpha3: 'CIV' },
    { name: 'Mali', localName: 'Mali', iso: 466, alpha2: 'ML', alpha3: 'MLI' },
    { name: 'Niger', localName: 'Niger', iso: 562, alpha2: 'NE', alpha3: 'NER' },
    { name: 'Burkina Faso', localName: 'Burkina Faso', iso: 854, alpha2: 'BF', alpha3: 'BFA' },
    { name: 'Sudan', localName: 'السودان (Sudan)', iso: 729, alpha2: 'SD', alpha3: 'SDN' },
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
  