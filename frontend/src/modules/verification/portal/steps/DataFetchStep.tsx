import React, { useState } from "react";
import type { VerificationForm } from "../VerificationPortal.tsx";
import LoadingSpinner from "../../ui/LoadingSpinner";
import { fetchGovernmentData } from "@/lib/mockApi";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { calculateAge } from "@/lib/identityUtils";

const DataFetchStep: React.FC<{
  formData: VerificationForm;
  setFormData: React.Dispatch<React.SetStateAction<VerificationForm>>;
  onNext: () => void;
  onBack: () => void;
}> = ({ formData, setFormData, onNext, onBack }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const account = useCurrentAccount();

  const fetchData = async () => {
    if (!account) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetchGovernmentData({
        country: formData.country,
        idNumber: formData.idNumber,
        walletAddress: account.address,
      });
      if (res.success && res.data) {
        setFormData((prev) => ({
          ...prev,
          fullName: res.data!.fullName,
          dateOfBirth: res.data!.dateOfBirth,
          photoReference: res.data!.photoReference,
        }));
      } else {
        setError(res.message || "Failed to verify your ID");
      }
    } catch (e) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const age = formData.dateOfBirth ? calculateAge(formData.dateOfBirth) : null;

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

              {age !== null && age >= 18 ? (
                <button onClick={onNext} style={{ padding: "10px 14px", borderRadius: 8, background: "#2563eb", color: "white" }}>
                  Continue to Face Verification
                </button>
              ) : (
                <div style={{ color: "#ef4444" }}>You must be 18 or older to use SUIrify services.</div>
              )}
            </div>
          ) : (
            <>
              <button onClick={fetchData} style={{ padding: "10px 14px", borderRadius: 8, background: "#2563eb", color: "white" }}>
                Fetch My Verified Data
              </button>
              {error && <div style={{ color: "#ef4444", marginTop: 8 }}>{error}</div>}
            </>
          )}

          <button onClick={onBack} style={{ marginTop: 12, padding: "8px 12px", borderRadius: 8, background: "#374151", color: "white" }}>
            Back
          </button>
        </>
      )}
    </div>
  );
};

export default DataFetchStep;
