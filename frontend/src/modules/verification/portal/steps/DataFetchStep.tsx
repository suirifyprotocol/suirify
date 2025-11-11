import React, { useCallback, useEffect, useState } from "react";
import type { StepComponentProps } from "../VerificationPortal";
import LoadingSpinner from "@/modules/verification/ui/LoadingSpinner";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { calculateAge } from "@/lib/identityUtils";
import { completeVerification } from "@/lib/apiService";

/**
 * Step 3: Fetch verified data once the face match succeeds.
 * Requires the connected wallet address to be sent to the backend.
 */
const DataFetchStep: React.FC<StepComponentProps> = ({ formData, setFormData, onNext, onBack }) => {
  const account = useCurrentAccount();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const hasVerifiedFace = formData.faceVerified;
  const hasFetchedData = Boolean(formData.fullName);
  const age = formData.dateOfBirth ? calculateAge(formData.dateOfBirth) : null;

  const handleFetch = useCallback(async () => {
    if (!formData.sessionId) {
      setError("Your verification session expired. Please start again.");
      return;
    }
    if (!account) {
      setError("Connect your wallet to continue.");
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await completeVerification({ sessionId: formData.sessionId, walletAddress: account.address });
      const consent = result.consentData;
      setFormData((prev) => ({
        ...prev,
        fullName: consent.fullName,
        dateOfBirth: consent.dateOfBirth,
        photoReference: consent.photoReference || null,
        walletAddress: account.address,
      }));
      setSuccess("Verified record retrieved successfully.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch verification data.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [account, formData.sessionId, setFormData]);

  useEffect(() => {
    if (hasVerifiedFace && !hasFetchedData && !loading && account && formData.sessionId) {
      void handleFetch();
    }
  }, [account, formData.sessionId, handleFetch, hasFetchedData, hasVerifiedFace, loading]);

  if (!hasVerifiedFace) {
    return (
      <div className="v-grid">
        <h2 className="v-section-title">Government Data Lookup</h2>
        <div className="v-error">
          Complete the face verification step before requesting your government record.
        </div>
        <div className="v-row v-margin-top">
          <button onClick={onBack} className="v-btn-secondary">
            Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="v-grid">
      <h2 className="v-section-title">Government Data Lookup</h2>
      <p className="v-muted">
        We'll retrieve your verified identity data using the secure session established in the previous steps. Only
        anonymised hashes are stored after minting.
      </p>

      {loading ? (
        <LoadingSpinner message="Contacting the verification service..." />
      ) : (
        <>
          {!hasFetchedData && !loading && account && (
            <button className="v-btn-primary" onClick={handleFetch}>
              Fetch My Verified Data
            </button>
          )}

          {success && <div className="v-success">{success}</div>}
          {error && <div className="v-error">{error}</div>}

          {hasFetchedData && (
            <div className="v-grid-lg">
              <div className="v-grid">
                <label>Full Name</label>
                <input className="v-input" value={formData.fullName} disabled />
              </div>
              <div className="v-grid">
                <label>Date of Birth</label>
                <input className="v-input" value={formData.dateOfBirth} disabled />
                {age !== null && (
                  <span className={age >= 18 ? "v-success" : "v-error v-strong"}>
                    {age >= 18 ? `Age verified (${age} years)` : `Must be at least 18 (${age} years)`}
                  </span>
                )}
              </div>

              {(formData.photoReference || formData.livePhoto) && (
                <div className="v-photo-compare" role="group" aria-label="Photo verification recap">
                  {formData.photoReference && (
                    <figure className="v-photo-card">
                      <span className="v-photo-label">Government Reference</span>
                      <img
                        src={formData.photoReference}
                        alt="Government ID reference"
                        className="v-photo-image"
                      />
                    </figure>
                  )}
                  {formData.livePhoto && (
                    <figure className="v-photo-card">
                      <span className="v-photo-label">Live Capture</span>
                      <img
                        src={formData.livePhoto}
                        alt="Live selfie captured during verification"
                        className="v-photo-image"
                      />
                    </figure>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="v-row v-margin-top">
            <button onClick={onBack} className="v-btn-secondary">
              Back
            </button>
            <button
              onClick={onNext}
              className={`v-btn-primary ${!hasFetchedData || (age !== null && age < 18) ? "v-btn-disabled" : ""}`}
              disabled={!hasFetchedData || (age !== null && age < 18)}
            >
              Continue to Consent
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default DataFetchStep;
