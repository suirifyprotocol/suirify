import React, { useState } from "react";
import type { VerificationForm } from "../VerificationPortal";

const ReviewConsentStep: React.FC<{
  formData: VerificationForm;
  onNext: () => void;
  onBack: () => void;
}> = ({ formData, onNext, onBack }) => {
  const [consentGiven, setConsentGiven] = useState(false);
  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>Review & Consent</h2>

      <div style={{ display: "grid", gap: 8, marginBottom: 12 }}>
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

      <div style={{ background: "#0f172a", padding: 12, borderRadius: 8 }}>
        <label style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
          <input type="checkbox" checked={consentGiven} onChange={(e) => setConsentGiven(e.target.checked)} />
          <span>
            I consent to mint my SUIrify Attestation. I understand that:
            <ul style={{ marginLeft: 20 }}>
              <li>My personal data will be permanently deleted after verification</li>
              <li>Only cryptographic proofs will be stored on-chain</li>
              <li>I can delete my attestation at any time</li>
              <li>This attestation is non-transferable and soulbound to my wallet</li>
            </ul>
          </span>
        </label>
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button onClick={onBack} style={{ padding: "8px 12px", borderRadius: 8, background: "#374151", color: "white" }}>
          Back
        </button>
        <button onClick={onNext} disabled={!consentGiven} style={{ padding: "10px 14px", borderRadius: 8, background: consentGiven ? "#2563eb" : "#6b7280", color: "white" }}>
          Mint My Attestation
        </button>
      </div>
    </div>
  );
};

export default ReviewConsentStep;
