import React from "react";
import type { VerificationForm } from "../VerificationPortal";

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
  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>Select Your Country & ID</h2>

      <div style={{ display: "grid", gap: 12 }}>
        <div>
          <label>Country</label>
          <select
            value={formData.country}
            onChange={(e) => setFormData({ ...formData, country: e.target.value, idNumber: "" })}
            style={{ width: "100%", padding: 8, borderRadius: 8, marginTop: 6 }}
          >
            <option value="">Select Country</option>
            <option value="Nigeria">Nigeria</option>
            <option value="Ghana">Ghana</option>
            <option value="Kenya">Kenya</option>
          </select>
        </div>

        {formData.country && (
          <div>
            <label>{countryConfig[formData.country].idType} Number</label>
            <input
              type="text"
              placeholder={countryConfig[formData.country].placeholder}
              value={formData.idNumber}
              onChange={(e) => setFormData({ ...formData, idNumber: e.target.value })}
              style={{ width: "100%", padding: 8, borderRadius: 8, marginTop: 6 }}
            />
            {formData.idNumber && !validateID(formData.country, formData.idNumber) && (
              <div style={{ color: "#ef4444", fontSize: 12, marginTop: 6 }}>
                Please enter a valid {countryConfig[formData.country].idType} number
              </div>
            )}
          </div>
        )}

        <button
          onClick={onNext}
          disabled={!formData.country || !validateID(formData.country, formData.idNumber)}
          style={{ padding: "10px 14px", borderRadius: 8, background: "#2563eb", color: "white" }}
        >
          Verify My ID
        </button>
      </div>
    </div>
  );
};

export default CountryIDStep;
