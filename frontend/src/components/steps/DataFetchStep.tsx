import React, { useCallback, useEffect, useState } from "react";
import type { VerificationForm } from "../VerificationPortal";
import LoadingSpinner from "../common/LoadingSpinner";
import { completeVerification } from "../../lib/apiService";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { calculateAge } from "../../lib/identityUtils";

const DataFetchStep: React.FC<{
  formData: VerificationForm;
  setFormData: React.Dispatch<React.SetStateAction<VerificationForm>>;
  onNext: () => void;
  onBack: () => void;
}> = ({ formData, setFormData, onNext, onBack }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const account = useCurrentAccount();

  const fetchData = useCallback(async () => {
    if (!formData.sessionId) {
      setError("Your verification session has expired. Please go back and start again.");
      return;
    }
    if (!account) {
      setError("Connect your wallet to continue.");
      return;
    }
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const res = await completeVerification({
        sessionId: formData.sessionId,
        walletAddress: account.address,
      });
      const data = res.consentData;
      if (data) {
        setFormData((prev) => ({
          ...prev,
          fullName: data.fullName || prev.fullName || "",
          dateOfBirth: data.dateOfBirth || prev.dateOfBirth || "",
          photoReference: data.photoReference || prev.photoReference || null,
          walletAddress: account.address,
        }));
        setSuccess("Government record retrieved successfully.");
      } else {
        setError("No verification data was returned for this session.");
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Network error. Please try again.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [account, formData.sessionId, setFormData]);

  useEffect(() => {
    if (formData.faceVerified && !formData.fullName && !loading && account && formData.sessionId) {
      void fetchData();
    }
  }, [account, fetchData, formData.faceVerified, formData.fullName, formData.sessionId, loading]);

  const age = formData.dateOfBirth ? calculateAge(formData.dateOfBirth) : null;
  const canContinue = Boolean(formData.fullName && formData.dateOfBirth);

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>Verify Your Identity</h2>

      {loading ? (
        <LoadingSpinner message="Verifying your ID with government database..." />
      ) : (
        <>
          {formData.fullName ? (
            <div style={{ display: "grid", gap: 12 }}>
              <div>
                <label>Full Name</label>
                <input type="text" value={formData.fullName} disabled style={{ width: "100%", padding: 8, borderRadius: 8, marginTop: 6 }} />
                <span style={{ marginLeft: 8, color: "#10b981" }}>✓ Verified</span>
              </div>

              <div>
                <label>Date of Birth</label>
                <input type="text" value={formData.dateOfBirth} disabled style={{ width: "100%", padding: 8, borderRadius: 8, marginTop: 6 }} />
                <span style={{ marginLeft: 8, color: "#10b981" }}>✓ Verified</span>
              </div>

              {(formData.photoReference || formData.livePhoto) && (
                <div className="v-photo-compare" role="group" aria-label="Photo verification recap">
                  {formData.photoReference && (
                    <figure className="v-photo-card">
                      <span className="v-photo-label">Government Reference</span>
                      <img src={formData.photoReference} alt="Government ID reference" className="v-photo-image" />
                    </figure>
                  )}
                  {formData.livePhoto && (
                    <figure className="v-photo-card">
                      <span className="v-photo-label">Live Capture</span>
                      <img src={formData.livePhoto} alt="Live selfie captured during verification" className="v-photo-image" />
                    </figure>
                  )}
                </div>
              )}

              <div>
                {age !== null && (
                  <div style={{
                    color: age >= 18 ? "#10b981" : "#ef4444",
                    fontWeight: 600,
                  }}>
                    {age >= 18 ? `✓ Age verified (${age} years)` : `✗ Must be 18 or older (${age} years)`}
                  </div>
                )}
              </div>

              {age !== null && age < 18 && (
                <div style={{ color: "#ef4444" }}>Warning: You are under 18. Your attestation will reflect this status.</div>
              )}

              <button
                onClick={onNext}
                style={{ padding: "10px 14px", borderRadius: 8, background: canContinue ? "#2563eb" : "#9ca3af", color: "white" }}
                disabled={!canContinue}
              >
                Continue to Face Verification
              </button>
            </div>
          ) : (
            <>
              {account && (
                <button onClick={fetchData} style={{ padding: "10px 14px", borderRadius: 8, background: "#2563eb", color: "white" }}>
                Fetch My Verified Data
                </button>
              )}
            </>
          )}

          <button onClick={onBack} style={{ marginTop: 12, padding: "8px 12px", borderRadius: 8, background: "#374151", color: "white" }}>
            Back
          </button>
        </>
      )}
      {success && <div style={{ color: "#10b981", marginTop: 12 }}>{success}</div>}
      {error && !loading && <div style={{ color: "#ef4444", marginTop: 12 }}>{error}</div>}
    </div>
  );
};

export default DataFetchStep;
