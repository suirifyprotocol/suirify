// This module resolves country -> jurisdiction policy id using only the
// JURISDICTION_POLICY_MAP environment variable (JSON string).

/**
 * Expected env format:
 * JURISDICTION_POLICY_MAP='{"Nigeria":"0xabc...","Ghana":"0xdef..."}'
 */

function _normalizeKey(key) {
  if (!key || typeof key !== 'string') return '';
  return key.trim().toLowerCase();
}

// Parse JURISDICTION_POLICY_MAP once at startup (defensive)
let policyMap = {};
if (process.env.JURISDICTION_POLICY_MAP) {
  try {
    const parsed = JSON.parse(process.env.JURISDICTION_POLICY_MAP);
    if (parsed && typeof parsed === 'object') {
      // normalize keys to lowercase for case-insensitive lookup
      Object.keys(parsed).forEach((k) => {
        const v = parsed[k];
        if (v && typeof v === 'string' && v.trim().length > 0) {
          policyMap[_normalizeKey(k)] = v.trim();
        }
      });
    }
  } catch (e) {
    console.warn('Invalid JURISDICTION_POLICY_MAP env var (expected JSON). Ignoring map.', e);
    policyMap = {};
  }
}

/**
 * Get policy id for a country (case-insensitive).
 * Returns the policy id string or null if not found.
 */
function getPolicyId(country) {
  const k = _normalizeKey(country);
  if (!k) return null;
  return policyMap[k] || null;
}

/**
 * Get full mapping as array for debugging/visibility.
 */
function getAllPolicies() {
  return Object.keys(policyMap).map((k) => ({ country: k, policyId: policyMap[k] }));
}

module.exports = { getPolicyId, getAllPolicies };
