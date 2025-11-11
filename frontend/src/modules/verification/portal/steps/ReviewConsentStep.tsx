import React from "react";
import type { StepComponentProps } from "../VerificationPortal";

const countryLabel = (country: string) => {
  if (!country) return "—";
  if (country === "Nigeria") return "Nigeria — National Identification Number";
  if (country === "Ghana") return "Ghana — Ghana Card";
  if (country === "Kenya") return "Kenya — National ID";
  return country;
};

/**
 * Step 4: Review retrieved data and confirm consent before minting.
 */
const ReviewConsentStep: React.FC<StepComponentProps> = ({ formData, setFormData, onNext, onBack }) => {
  const handleConsentChange = (checked: boolean) => {
    setFormData((prev) => ({ ...prev, consentGiven: checked }));
  };

  const readyToMint = formData.consentGiven && formData.faceVerified && Boolean(formData.fullName);

  return (
    <div className="v-grid">
      <h2 className="v-section-title">Review &amp; Consent</h2>

      <div className="v-card" style={{ background: "#0f172a" }}>
        <h3 className="v-card-title">Verified data</h3>
        <div className="v-grid-lg v-margin-top">
          <div>
            <strong>Full Name</strong>
            <div>{formData.fullName || "—"}</div>
          </div>
          <div>
            <strong>Date of Birth</strong>
            <div>{formData.dateOfBirth || "—"}</div>
          </div>
          <div>
            <strong>Country &amp; ID</strong>
            <div>{countryLabel(formData.country)}</div>
          </div>
          <div>
            <strong>Wallet</strong>
            <div className="v-muted v-small">{formData.walletAddress || "Connect wallet"}</div>
          </div>
          <div>
            <strong>Face check</strong>
            <div>
              {formData.faceVerified ? (
                <span className="v-success">✓ Match confirmed</span>
              ) : (
                <span className="v-error">Pending</span>
              )}
              {formData.faceSimilarity !== null && formData.faceDiffPercent !== null && (
                <div className="v-muted v-small">
                  Similarity: {(formData.faceSimilarity * 100).toFixed(1)}% · Diff: {(formData.faceDiffPercent * 100).toFixed(1)}%
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="v-grid v-margin-top">
          <label className="v-consent">
            <input
              type="checkbox"
              checked={formData.consentGiven}
              onChange={(event) => handleConsentChange(event.target.checked)}
            />
            <span>
              I consent to mint my SUIrify attestation. I understand that:
              <ul>
                <li>Personal data is deleted after minting; only hashes remain on-chain.</li>
                <li>The attestation is non-transferable and bound to my wallet.</li>
                <li>I may revoke this attestation at any time via the dashboard.</li>
                <li>Minting will require a signer confirmation in my wallet.</li>
              </ul>
            </span>
          </label>
        </div>
      </div>

      <div className="v-row v-margin-top">
        <button onClick={onBack} className="v-btn-secondary">
          Back
        </button>
        <button
          onClick={onNext}
          className={`v-btn-primary ${!readyToMint ? "v-btn-disabled" : ""}`}
          disabled={!readyToMint}
        >
          Proceed to Mint
        </button>
      </div>
    </div>
  );
};

export default ReviewConsentStep;
