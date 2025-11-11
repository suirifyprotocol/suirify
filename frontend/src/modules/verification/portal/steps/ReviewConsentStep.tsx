import React, { useState } from "react";
import type { VerificationForm } from "../VerificationPortal.tsx";

/**
 * Step 4: Review & Consent
 * - Shows verified fields for confirmation.
 * - Requires explicit consent before minting.
 */
const ReviewConsentStep: React.FC<{
  formData: VerificationForm;
  onNext: () => void;
  onBack: () => void;
}> = ({ formData, onNext, onBack }) => {
  const [consentGiven, setConsentGiven] = useState(false);
  return (
    <div>
      <h2 className="v-section-title">Review & Consent</h2>

      <div className="v-grid v-margin-bottom">
        <h3>Your Verified Information:</h3>
        <div>
          <strong>Full Name:</strong> {formData.fullName}
        </div>
        <div>
          <strong>Date of Birth:</strong> {formData.dateOfBirth}
        </div>
        <div>
          <strong>Country:</strong> {formData.country}
        </div>
        <div>
          <strong>ID Type:</strong> {formData.country === "Nigeria" ? "NIN" : "National ID"}
        </div>
      </div>

      <div className="v-card">
        <label className="v-consent">
          <input type="checkbox" checked={consentGiven} onChange={(e) => setConsentGiven(e.target.checked)} />
          <span>
            I consent to mint my SUIrify Attestation. I understand that:
            <ul>
              <li>My personal data will be permanently deleted after verification</li>
              <li>Only cryptographic proofs will be stored on-chain</li>
              <li>I can delete my attestation at any time</li>
              <li>This attestation is non-transferable and soulbound to my wallet</li>
            </ul>
          </span>
        </label>
      </div>

      <div className="v-row v-margin-top">
        <button onClick={onBack} className="v-btn-secondary">
          Back
        </button>
        <button onClick={onNext} disabled={!consentGiven} className={`v-btn-primary ${!consentGiven ? 'v-btn-disabled' : ''}`}>
          Mint My Attestation
        </button>
      </div>
    </div>
  );
};

export default ReviewConsentStep;
