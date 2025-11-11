import React, { useEffect, useMemo, useState } from "react";
import type { StepComponentProps } from "../VerificationPortal";
import { fetchCountries, startVerification, type CountryOption } from "@/lib/apiService";

type CountryConfig = {
  idType: string;
  placeholder: string;
  pattern: RegExp;
  example: string;
};

const COUNTRY_CONFIG: Record<string, CountryConfig> = {
  Nigeria: {
    idType: "National Identification Number (NIN)",
    placeholder: "Enter your 11-digit NIN",
    pattern: /^\d{11}$/,
    example: "12345678901",
  },
  Ghana: {
    idType: "Ghana Card Number",
    placeholder: "Enter your Ghana Card ID (e.g. GHA-123456789)",
    pattern: /^GHA-[A-Z0-9]{9}$/i,
    example: "GHA-123456789",
  },
  Kenya: {
    idType: "Kenya National ID",
    placeholder: "Enter your National ID (8 digits)",
    pattern: /^\d{8}$/,
    example: "12345678",
  },
};

const fallbackOptions = Object.keys(COUNTRY_CONFIG).map((name) => ({ value: name, label: name }));

const normalizeCountryName = (value: string) => value.trim().toLowerCase();

const resolveCountryOption = (option: CountryOption): string | null => {
  const known = Object.keys(COUNTRY_CONFIG);
  const matches = known.find((name) => normalizeCountryName(name) === normalizeCountryName(option.name || option.label));
  return matches || null;
};

const validateGovernmentId = (country: string, idNumber: string) => {
  const config = COUNTRY_CONFIG[country];
  if (!config) return false;
  return config.pattern.test(idNumber.trim());
};

/**
 * Step 1: Capture user country + ID and create a backend verification session.
 */
const CountryIDStep: React.FC<StepComponentProps> = ({ formData, setFormData, onNext, resetForm }) => {
  const [country, setCountry] = useState(formData.country);
  const [idNumber, setIdNumber] = useState(formData.idNumber);
  const [options, setOptions] = useState(fallbackOptions);
  const [loading, setLoading] = useState(false);
  const [loadingCountries, setLoadingCountries] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionMessage, setSessionMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const loadCountries = async () => {
      setLoadingCountries(true);
      try {
        const res = await fetchCountries();
        if (cancelled) return;
        const mapped = res.countries
          .map((option) => {
            const key = resolveCountryOption(option);
            if (!key) return null;
            return { value: key, label: option.label || option.name };
          })
          .filter(Boolean) as { value: string; label: string }[];
        if (mapped.length) setOptions(mapped);
      } catch (err) {
        console.warn("Failed to fetch countries from backend", err);
      } finally {
        if (!cancelled) setLoadingCountries(false);
      }
    };
    loadCountries();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setSessionMessage(formData.sessionId ? "Session active" : null);
  }, [formData.sessionId]);

  const selectedConfig = useMemo(() => (country ? COUNTRY_CONFIG[country] : null), [country]);
  const isValid = country ? validateGovernmentId(country, idNumber) : false;

  const handleStart = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!country) {
      setError("Please select a supported country.");
      return;
    }
    if (!isValid) {
      setError("Enter a valid ID in the expected format.");
      return;
    }

    setLoading(true);
    setError(null);
    setSessionMessage(null);
    const trimmedId = idNumber.trim();

    try {
      const response = await startVerification({ country, idNumber: trimmedId });
      setFormData((prev) => ({
        ...prev,
        sessionId: response.sessionId,
        country,
        idNumber: trimmedId,
        fullName: "",
        dateOfBirth: "",
        photoReference: null,
        livePhoto: null,
        faceVerified: false,
        faceSimilarity: null,
        faceDiffPercent: null,
        consentGiven: false,
        mintDigest: null,
      }));
      setSessionMessage("Verification session created. Continue to face capture.");
      onNext();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to start verification.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    resetForm();
    setCountry("");
    setIdNumber("");
    setError(null);
    setSessionMessage(null);
  };

  return (
    <form onSubmit={handleStart} className="v-grid">
      <h2 className="v-section-title">Select Your Country &amp; Government ID</h2>

      <div>
        <label htmlFor="country-select">Country</label>
        <select
          id="country-select"
          className="v-input"
          value={country}
          disabled={loading}
          onChange={(event) => {
            const value = event.target.value;
            setCountry(value);
            setIdNumber("");
            setError(null);
          }}
        >
          <option value="">{loadingCountries ? "Loading countries..." : "Select Country"}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {selectedConfig && (
        <div>
          <label htmlFor="gov-id">{selectedConfig.idType}</label>
          <input
            id="gov-id"
            className="v-input"
            type="text"
            value={idNumber}
            placeholder={selectedConfig.placeholder}
            autoComplete="off"
            spellCheck={false}
            disabled={loading}
            onChange={(event) => {
              setIdNumber(event.target.value);
              setError(null);
            }}
          />
          <div className="v-small v-muted">Format example: {selectedConfig.example}</div>
          {idNumber && !isValid && <div className="v-error v-small">ID does not match the expected format.</div>}
        </div>
      )}

      {sessionMessage && <div className="v-success v-small">{sessionMessage}</div>}
      {error && <div className="v-error">{error}</div>}

      <div className="v-row v-margin-top">
        <button type="submit" className={`v-btn-primary ${!isValid ? "v-btn-disabled" : ""}`} disabled={!isValid || loading}>
          {loading ? "Starting..." : "Create Verification Session"}
        </button>
        <button type="button" className="v-btn-secondary" onClick={handleReset} disabled={loading}>
          Start Over
        </button>
      </div>
    </form>
  );
};

export default CountryIDStep;
