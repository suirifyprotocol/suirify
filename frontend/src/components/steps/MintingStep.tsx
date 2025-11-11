import React, { useCallback, useEffect, useState } from "react";
import type { VerificationForm } from "../VerificationPortal";
import LoadingSpinner from "../common/LoadingSpinner";
import { explorer } from "../../lib/config";
import { createMintTransaction, submitMintSignature } from "../../lib/apiService";
import { useCurrentAccount, useSignTransaction } from "@mysten/dapp-kit";

const MintingStep: React.FC<{
  formData: VerificationForm;
  setFormData: React.Dispatch<React.SetStateAction<VerificationForm>>;
  onNext: () => void;
  onBack: () => void;
}> = ({ formData, setFormData, onBack }) => {
  const account = useCurrentAccount();
  const signTransaction = useSignTransaction();
  const [status, setStatus] = useState<"idle" | "preparing" | "signing" | "submitting" | "success" | "error">(
    formData.mintDigest ? "success" : "idle"
  );
  const [transactionDigest, setTransactionDigest] = useState(formData.mintDigest || "");
  const [error, setError] = useState("");
  const [transactionPreview, setTransactionPreview] = useState("");

  const runMintFlow = useCallback(async () => {
    if (!formData.sessionId) {
      setStatus("error");
      setError("Verification session missing or already consumed. Please restart the process.");
      return;
    }
    if (!account) {
      setStatus("error");
      setError("Connect your wallet to sign the transaction.");
      return;
    }

    try {
    setError("");
    setStatus("preparing");
    const { transaction } = await createMintTransaction({ sessionId: formData.sessionId });
    setTransactionPreview(`${transaction.slice(0, 24)}…`);

      setStatus("signing");
      const signed = await signTransaction.mutateAsync({ transaction });
      const userSignature = (signed as any)?.signature ?? signed;
      if (!userSignature || typeof userSignature !== "string") {
        throw new Error("Wallet did not return a signature.");
      }

      setStatus("submitting");
      const submitResult = await submitMintSignature({
        sessionId: formData.sessionId,
        userSignature,
        transaction,
      });

      const digest = submitResult.digest;
      if (!digest) throw new Error("Wallet did not return a transaction digest.");

      setTransactionDigest(digest);
      setStatus("success");
      setFormData((prev) => ({
        ...prev,
        sessionId: null,
        mintDigest: digest,
      }));

      if (typeof window !== "undefined") {
        window.setTimeout(() => {
          window.location.href = "/dashboard";
        }, 3000);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to mint attestation.";
      setError(message);
      setStatus("error");
    }
  }, [account, formData.sessionId, setFormData, signTransaction]);

  useEffect(() => {
    if (status === "idle") {
      runMintFlow();
    }
  }, [runMintFlow, status]);

  if (status === "idle" || status === "preparing") {
    return (
      <div>
        <LoadingSpinner message="Minting your SUIrify Attestation..." />
        <p>This may take a few moments. Please don't close this window.</p>
      </div>
    );
  }

  if (status === "signing") {
    return (
      <div>
        <LoadingSpinner message="Approve the transaction in your wallet to continue." />
        {transactionPreview && <p style={{ color: "#9ca3af" }}>Tx preview: {transactionPreview}</p>}
      </div>
    );
  }

  if (status === "submitting") {
    return (
      <div>
        <LoadingSpinner message="Submitting sponsored transaction..." />
        {transactionPreview && <p style={{ color: "#9ca3af" }}>Tx preview: {transactionPreview}</p>}
      </div>
    );
  }

  if (status === "error") {
    return (
      <div>
        <div style={{ color: "#ef4444" }}>
          <h3>Minting Failed</h3>
          <p>{error || "There was an error creating your attestation. Please try again."}</p>
          <div style={{ display: "flex", gap: 12 }}>
            <button onClick={onBack} style={{ padding: "8px 12px", borderRadius: 8, background: "#374151", color: "white" }}>
              Back
            </button>
            <button
              onClick={() => {
                setError("");
                setTransactionDigest("");
                setTransactionPreview("");
                setStatus("idle");
              }}
              style={{ padding: "8px 12px", borderRadius: 8, background: "#2563eb", color: "white" }}
            >
              Retry Minting
            </button>
          </div>
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
