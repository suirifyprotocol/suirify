import React, { useEffect, useMemo, useState } from "react";
import type { VerificationForm } from "../VerificationPortal";
import type { CountryOption } from "../../lib/apiService";
import { fetchCountries, startVerification } from "../../lib/apiService";
import { toUserFacingMessage } from "../../lib/errorMessages";

const countryConfig: Record<string, { idType: string; placeholder: string; pattern: RegExp }> = {
  Nigeria: { idType: "NIN", placeholder: "Enter your 11-digit NIN", pattern: /^\d{11}$/ },
  Ghana: { idType: "Ghana Card", placeholder: "Enter Ghana Card number", pattern: /^GHA-\w{9}$/ },
  Kenya: { idType: "National ID", placeholder: "Enter National ID", pattern: /^\d{8}$/ },
};

const validateID = (country: string, idNumber: string) => {
  const config = countryConfig[country];
  if (!config) return false;
  return config.pattern.test(idNumber);
};

const CountryIDStep: React.FC<{
  formData: VerificationForm;
  setFormData: React.Dispatch<React.SetStateAction<VerificationForm>>;
  onNext: () => void;
}> = ({ formData, setFormData, onNext }) => {
  const [countries, setCountries] = useState<CountryOption[]>([]);
  const [loadingCountries, setLoadingCountries] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoadingCountries(true);
      try {
        const result = await fetchCountries();
        if (mounted && Array.isArray(result.countries)) {
          setCountries(result.countries);
        }
      } catch (err) {
        // Prefer a small inline warning; keep flow usable with fallback options.
        if (mounted) {
          setError(toUserFacingMessage(err, "Failed to load countries. Using defaults."));
        }
      } finally {
        if (mounted) setLoadingCountries(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const availableCountries = useMemo(() => {
    if (!countries.length) {
      return Object.keys(countryConfig).map((name) => ({ name, label: name }));
    }
    return countries
      .filter((country) => !!countryConfig[country.name])
      .map((country) => ({ name: country.name, label: country.label || country.name }));
  }, [countries]);

  const handleCountryChange = (value: string) => {
    setError(null);
    setFormData((prev) => ({
      ...prev,
      country: value,
      idNumber: "",
      sessionId: null,
      fullName: "",
      dateOfBirth: "",
      photoReference: null,
      walletAddress: null,
      livePhoto: null,
      faceVerified: false,
      faceSimilarity: null,
      faceDiffPercent: null,
      mintDigest: null,
    }));
  };

  const handleIdChange = (value: string) => {
    setError(null);
    setFormData((prev) => ({
      ...prev,
      idNumber: value,
      sessionId: null,
      faceVerified: false,
      livePhoto: null,
      faceSimilarity: null,
      faceDiffPercent: null,
      mintDigest: null,
    }));
  };

  const handleVerify = async () => {
    if (!formData.country || !validateID(formData.country, formData.idNumber)) return;

    setSubmitting(true);
    setError(null);
    try {
      const response = await startVerification({
        country: formData.country,
        idNumber: formData.idNumber,
      });

      setFormData((prev) => ({
        ...prev,
        sessionId: response.sessionId,
        fullName: "",
        dateOfBirth: "",
        photoReference: null,
        walletAddress: null,
        livePhoto: null,
        faceVerified: false,
        faceSimilarity: null,
        faceDiffPercent: null,
        mintDigest: null,
      }));

      onNext();
    } catch (err) {
      const message = toUserFacingMessage(err, "We couldn't start your verification. Please try again.");
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>Select Your Country & ID</h2>

      <div style={{ display: "grid", gap: 12 }}>
        <div>
          <label>Country</label>
          <select
            value={formData.country}
            onChange={(e) => handleCountryChange(e.target.value)}
            style={{ width: "100%", padding: 8, borderRadius: 8, marginTop: 6 }}
            disabled={loadingCountries}
          >
            <option value="">{loadingCountries ? "Loading countries..." : "Select Country"}</option>
            {availableCountries.map((country) => (
              <option key={country.name} value={country.name}>
                {country.label}
              </option>
            ))}
          </select>
        </div>

        {formData.country && (
          <div>
            <label>{countryConfig[formData.country].idType} Number</label>
            <input
              type="text"
              placeholder={countryConfig[formData.country].placeholder}
              value={formData.idNumber}
              onChange={(e) => handleIdChange(e.target.value)}
              style={{ width: "100%", padding: 8, borderRadius: 8, marginTop: 6 }}
            />
            {formData.idNumber && !validateID(formData.country, formData.idNumber) && (
              <div style={{ color: "#ef4444", fontSize: 12, marginTop: 6 }}>
                Please enter a valid {countryConfig[formData.country].idType} number
              </div>
            )}
          </div>
        )}

        {error && <div style={{ color: "#f87171" }}>{error}</div>}

        <button
          onClick={handleVerify}
          disabled={submitting || !formData.country || !validateID(formData.country, formData.idNumber)}
          style={{ padding: "10px 14px", borderRadius: 8, background: "#2563eb", color: "white" }}
        >
          {submitting ? "Starting Verification..." : "Verify My ID"}
        </button>
      </div>
    </div>
  );
};

export default CountryIDStep;
