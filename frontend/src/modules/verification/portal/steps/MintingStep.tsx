import React, { useEffect, useState } from "react";
import type { VerificationForm } from "../VerificationPortal.tsx";
import LoadingSpinner from "../../ui/LoadingSpinner";
import { mintAttestation } from "@/lib/mockApi";
import { explorer } from "@/lib/config";

const MintingStep: React.FC<{
  formData: VerificationForm;
  onNext: () => void;
}> = ({ formData }) => {
  const [status, setStatus] = useState<"minting" | "success" | "error">("minting");
  const [transactionDigest, setTransactionDigest] = useState("");
  const [attestationId, setAttestationId] = useState("");

  useEffect(() => {
    const run = async () => {
      try {
        const res = await mintAttestation({
          walletAddress: "demo",
          fullName: formData.fullName,
          country: formData.country,
          verificationLevel: 1,
          claims: { is_human_verified: true, is_over_18: true },
        });
        if (res.success) {
          setTransactionDigest(res.transactionDigest || "");
          setAttestationId(res.attestationObjectId || "");
          setStatus("success");
          setTimeout(() => {
            window.location.href = "/dashboard";
          }, 3000);
        } else {
          setStatus("error");
        }
      } catch {
        setStatus("error");
      }
    };
    run();
  }, []);

  if (status === "minting") {
    return (
      <div>
        <LoadingSpinner message="Minting your SUIrify Attestation..." />
        <p>This may take a few moments. Please don't close this window.</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div>
        <div style={{ color: "#ef4444" }}>
          <h3>Minting Failed</h3>
          <p>There was an error creating your attestation. Please try again.</p>
          <button onClick={() => window.location.reload()} style={{ padding: "8px 12px", borderRadius: 8, background: "#2563eb", color: "white" }}>
            Retry Minting
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ fontSize: 36 }}>🎉</div>
      <h2>Verification Complete!</h2>
      <p>Your SUIrify Attestation has been successfully minted.</p>

      <div style={{ background: "#0f172a", padding: 12, borderRadius: 8, marginTop: 12 }}>
        <div style={{ marginBottom: 6 }}>
          <strong>Level:</strong> L1 - {formData.country} {formData.country === "Nigeria" ? "NIN" : "ID"} Verified
        </div>
        <div style={{ marginBottom: 6 }}>
          <strong>Status:</strong> <span style={{ color: "#10b981" }}>Active</span>
        </div>
        <div style={{ marginBottom: 6 }}>
          <strong>Expires:</strong> 1 year
        </div>
        <div>
          <strong>Claims:</strong> Human ✓ | Over 18 ✓
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
        {transactionDigest && (
          <a href={explorer.tx(transactionDigest)} target="_blank" rel="noreferrer" style={{ color: "#60a5fa" }}>
            View Transaction on Explorer
          </a>
        )}
        {attestationId && (
          <a href={explorer.object(attestationId)} target="_blank" rel="noreferrer" style={{ color: "#60a5fa" }}>
            View Attestation Object
          </a>
        )}
      </div>

      <div style={{ marginTop: 12 }}>
        <p>Redirecting to your dashboard in 3 seconds...</p>
        <button onClick={() => (window.location.href = "/dashboard")} style={{ padding: "8px 12px", borderRadius: 8, background: "#2563eb", color: "white" }}>
          Go to Dashboard Now
        </button>
      </div>
    </div>
  );
};

export default MintingStep;
