import React from "react";
import type { VerificationForm } from "../VerificationPortal.tsx";

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

/**
 * Step 1: Country & ID Selection
 * - Lets user select country and enter national ID.
 * - Validates format per-country before allowing next.
 */
const CountryIDStep: React.FC<{
  formData: VerificationForm;
  setFormData: React.Dispatch<React.SetStateAction<VerificationForm>>;
  onNext: () => void;
}> = ({ formData, setFormData, onNext }) => {
  return (
    <div>
      <h2 className="v-section-title">Select Your Country & ID</h2>

      <div className="v-grid">
        <div>
          <label>Country</label>
          <select
            value={formData.country}
            onChange={(e) => setFormData({ ...formData, country: e.target.value, idNumber: "" })}
            className="v-input"
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
              className="v-input"
            />
            {formData.idNumber && !validateID(formData.country, formData.idNumber) && (
              <div className="v-error v-small">
                Please enter a valid {countryConfig[formData.country].idType} number
              </div>
            )}
          </div>
        )}

        <button
          onClick={onNext}
          disabled={!formData.country || !validateID(formData.country, formData.idNumber)}
          className={`v-btn-primary ${!formData.country || !validateID(formData.country, formData.idNumber) ? 'v-btn-disabled' : ''}`}
        >
          Verify My ID
        </button>
      </div>
    </div>
  );
};

export default CountryIDStep;
