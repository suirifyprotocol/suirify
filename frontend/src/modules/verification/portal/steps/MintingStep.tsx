import React, { useCallback, useEffect, useState } from "react";
import type { StepComponentProps } from "../VerificationPortal";
import LoadingSpinner from "@/modules/verification/ui/LoadingSpinner";
import { explorer } from "@/lib/config";
import { useCurrentAccount, useSignTransaction } from "@mysten/dapp-kit";
import { createMintTransaction, submitMintSignature } from "@/lib/apiService";

type MintStatus = "idle" | "preparing" | "signing" | "submitting" | "success" | "error";

const MintingStep: React.FC<StepComponentProps> = ({ formData, setFormData, onBack }) => {
  const account = useCurrentAccount();
  const signTransaction = useSignTransaction();

  const [status, setStatus] = useState<MintStatus>(formData.mintDigest ? "success" : "idle");
  const [error, setError] = useState<string | null>(null);
  const [digest, setDigest] = useState<string | null>(formData.mintDigest);
  const [transactionPreview, setTransactionPreview] = useState<string | null>(null);

  const sessionId = formData.sessionId;

  const resetError = () => {
    setError(null);
    setTransactionPreview(null);
  };

  const runMintFlow = useCallback(async () => {
    if (!sessionId) {
      setStatus("error");
      setError("Verification session missing or already consumed. Please restart the flow.");
      return;
    }
    if (!account) {
      setStatus("error");
      setError("Connect your wallet to sign the transaction.");
      return;
    }

    try {
      resetError();
      setStatus("preparing");
      const { transaction } = await createMintTransaction({ sessionId });
      setTransactionPreview(`${transaction.slice(0, 24)}…`);

      setStatus("signing");
      const signed = await signTransaction.mutateAsync({ transaction });
      const userSignature = (signed as any)?.signature ?? signed;
      if (!userSignature || typeof userSignature !== "string") {
        throw new Error("Wallet did not return a signature.");
      }

      setStatus("submitting");
      const submitResult = await submitMintSignature({ sessionId, userSignature, transaction });
      const digestValue = submitResult.digest;
      if (!digestValue) throw new Error("Wallet did not return a transaction digest.");

      setDigest(digestValue);
      setStatus("success");
      setFormData((prev) => ({
        ...prev,
        sessionId: null,
        mintDigest: digestValue,
      }));
    } catch (err) {
      setStatus("error");
      const message = err instanceof Error ? err.message : "Failed to mint attestation.";
      setError(message);
    }
  }, [account, sessionId, setFormData, signTransaction]);

  useEffect(() => {
    if (status === "idle" && !digest) {
      runMintFlow();
    }
  }, [digest, runMintFlow, status]);

  if (!sessionId && !digest) {
    return (
      <div className="v-grid">
        <h2 className="v-section-title">Mint Attestation</h2>
        <div className="v-error">No active session found. Please restart the verification process.</div>
        <button onClick={onBack} className="v-btn-secondary v-margin-top">
          Back
        </button>
      </div>
    );
  }

  if (status === "preparing") {
    return (
      <div className="v-grid">
        <h2 className="v-section-title">Preparing Transaction</h2>
        <LoadingSpinner message="Building a sponsored transaction on the server..." />
      </div>
    );
  }

  if (status === "signing") {
    return (
      <div className="v-grid">
        <h2 className="v-section-title">Awaiting Wallet Signature</h2>
        <LoadingSpinner message="Approve the transaction in your wallet to mint the attestation." />
        {transactionPreview && <div className="v-muted v-small">Tx bytes: {transactionPreview}</div>}
      </div>
    );
  }

  if (status === "submitting") {
    return (
      <div className="v-grid">
        <h2 className="v-section-title">Submitting Transaction</h2>
        <LoadingSpinner message="Finalising the sponsored transaction on Sui..." />
        {transactionPreview && <div className="v-muted v-small">Tx bytes: {transactionPreview}</div>}
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="v-grid">
        <h2 className="v-section-title">Mint Attestation</h2>
        <div className="v-error">{error || "Minting failed."}</div>
        <div className="v-row v-margin-top">
          <button onClick={onBack} className="v-btn-secondary">
            Back
          </button>
          <button onClick={() => setStatus("idle")} className="v-btn-primary">
            Retry Minting
          </button>
        </div>
      </div>
    );
  }

  if (!digest) {
    return (
      <div className="v-grid">
        <h2 className="v-section-title">Mint Attestation</h2>
        <LoadingSpinner message="Finalising transaction..." />
      </div>
    );
  }

  return (
    <div className="v-grid">
      <h2 className="v-section-title">Verification Complete 🎉</h2>
      <p className="v-muted">
        Your SUIrify attestation has been minted successfully. It should appear in your wallet momentarily.
      </p>

      <div className="v-card v-margin-top">
        <div className="v-margin-bottom">
          <strong>Owner:</strong> {formData.walletAddress || "Unknown"}
        </div>
        <div className="v-margin-bottom">
          <strong>Jurisdiction:</strong> {formData.country || "—"}
        </div>
        <div className="v-margin-bottom">
          <strong>Status:</strong> <span className="v-success">Active</span>
        </div>
        <div className="v-margin-bottom">
          <strong>Claims:</strong> Human ✓ &nbsp; Over 18 ✓
        </div>
        <div>
          <strong>Transaction Digest:</strong> {digest}
        </div>
      </div>

      <div className="v-row v-margin-top">
        <a href={explorer.tx(digest)} target="_blank" rel="noreferrer" className="v-link">
          View on Sui Explorer
        </a>
        <button className="v-btn-secondary" onClick={() => window.open("/dashboard", "_self") }>
          Go to Dashboard
        </button>
      </div>
    </div>
  );
};

export default MintingStep;
