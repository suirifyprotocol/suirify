import React, { useCallback, useEffect, useState } from "react";
import type { StepComponentProps } from "../VerificationPortal";
import LoadingSpinner from "@/modules/verification/ui/LoadingSpinner";
import { explorer } from "@/lib/config";
import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClient } from "@mysten/dapp-kit";
import { fetchMintConfig, finalizeMint, lookupMintRequest } from "@/lib/apiService";
import { Transaction } from "@mysten/sui/transactions";
import { toUserFacingMessage } from "@/lib/errorMessages";

type MintStatus = "idle" | "configuring" | "requesting" | "finalizing" | "success" | "error";

const MintingStep: React.FC<StepComponentProps> = ({ formData, setFormData, onBack }) => {
  const account = useCurrentAccount();
  const signAndExecute = useSignAndExecuteTransaction();
  const suiClient = useSuiClient();

  const [status, setStatus] = useState<MintStatus>(formData.mintDigest ? "success" : "idle");
  const [error, setError] = useState<string | null>(null);
  const [digest, setDigest] = useState<string | null>(formData.mintDigest);
  const [requestId, setRequestIdState] = useState<string | null>(formData.mintRequestId ?? null);
  const [requestDigest, setRequestDigestState] = useState<string | null>(formData.mintRequestDigest ?? null);

  const sessionId = formData.sessionId;

  const setRequestId = useCallback(
    (value: string | null) => {
      setRequestIdState(value);
      setFormData((prev) => ({
        ...prev,
        mintRequestId: value,
      }));
    },
    [setFormData]
  );

  const setRequestDigest = useCallback(
    (value: string | null) => {
      setRequestDigestState(value);
      setFormData((prev) => ({
        ...prev,
        mintRequestDigest: value,
      }));
    },
    [setFormData]
  );

  const resetError = () => {
    setError(null);
  };

  const runMintFlow = useCallback(async () => {
    if (!sessionId) {
      setStatus("error");
      setError("Verification session missing or already consumed. Please restart the flow.");
      return;
    }
    if (!account?.address) {
      setStatus("error");
      setError("Connect your wallet to sign the transaction.");
      return;
    }

    try {
      resetError();
      setStatus("configuring");
      let currentRequestId = requestId;
      let currentRequestDigest = requestDigest;

      if (!currentRequestId) {
        try {
          const existing = await lookupMintRequest(account.address);
          if (existing?.hasRequest && existing.requestId) {
            const digest = existing.requestTxDigest || null;
            setRequestId(existing.requestId);
            setRequestDigest(digest);
            currentRequestId = existing.requestId;
            currentRequestDigest = digest;
          }
        } catch (lookupError) {
          console.warn("Failed to check for existing mint request:", lookupError);
        }
      }

      let config: Awaited<ReturnType<typeof fetchMintConfig>> | null = null;

      if (!currentRequestId) {
        config = await fetchMintConfig();
        if (!config?.packageId || !config.attestationRegistryId) {
          throw new Error("Protocol configuration is incomplete.");
        }
        const mintFeeMist = config.mintFeeMist ?? config.mintFee;
        if (!mintFeeMist) {
          throw new Error("Mint fee not available. Please try again later.");
        }

        setStatus("requesting");
        const tx = new Transaction();
        tx.setSender(account.address);
        const mintFee = BigInt(mintFeeMist).toString();
        const [feeCoin] = tx.splitCoins(tx.gas, [tx.pure.u64(mintFee)]);
        tx.moveCall({
          target: `${config.packageId}::protocol::create_mint_request`,
          arguments: [tx.object(config.attestationRegistryId), feeCoin],
        });

        const requestResult = await signAndExecute.mutateAsync({ transaction: tx });

        const mintRequestDigest = requestResult.digest || null;
        if (!mintRequestDigest) {
          throw new Error("Mint request transaction did not return a digest.");
        }

        const packageId = config.packageId;
        const txDetails: any = await suiClient.waitForTransaction({
          digest: mintRequestDigest,
          options: {
            showEvents: true,
          },
        });

        const mintEvent = (txDetails.events || []).find(
          (evt: any) => evt.type === `${packageId}::protocol::MintRequestCreated`
        );
        const eventRequestId = mintEvent?.parsedJson?.request_id || mintEvent?.parsedJson?.requestId || null;
        const eventRequester = mintEvent?.parsedJson?.requester || mintEvent?.parsedJson?.requester_address || null;
        if (!eventRequestId) {
          throw new Error("Mint request transaction did not emit a request id.");
        }
        if (eventRequester && eventRequester.toLowerCase() !== account.address.toLowerCase()) {
          throw new Error("Mint request was created for a different wallet. Please contact support.");
        }

        setRequestId(eventRequestId);
        setRequestDigest(mintRequestDigest);

        currentRequestId = eventRequestId;
        currentRequestDigest = mintRequestDigest;
      }

      if (!currentRequestId) {
        throw new Error("Mint request not available. Please retry the minting step.");
      }

      setStatus("finalizing");
      const finalizeResult = await finalizeMint({
        sessionId,
        requestId: currentRequestId,
        requestTxDigest: currentRequestDigest || undefined,
      });

      const digestValue = finalizeResult.digest;
      if (!digestValue) throw new Error("Mint finalisation did not return a digest.");

      setDigest(digestValue);
      setStatus("success");
      setFormData((prev) => ({
        ...prev,
        sessionId: null,
        mintDigest: digestValue,
        mintRequestId: null,
        mintRequestDigest: null,
      }));
      setRequestId(null);
      setRequestDigest(null);
    } catch (err) {
      setStatus("error");
      if (err instanceof Error && (err as Error & { status?: number }).status === 409) {
        setError(err.message || "Wallet already holds an attestation. Please visit your dashboard.");
      } else {
        const message = toUserFacingMessage(err, "Failed to mint attestation. Please try again.");
        setError(message);
      }
    }
  }, [
    account,
    requestDigest,
    requestId,
    sessionId,
    setFormData,
    setRequestDigest,
    setRequestId,
    signAndExecute,
    suiClient,
  ]);

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

  if (status === "configuring") {
    return (
      <div className="v-grid">
        <h2 className="v-section-title">Preparing Transaction</h2>
        <LoadingSpinner message="Fetching protocol configuration..." />
      </div>
    );
  }

  if (status === "requesting") {
    return (
      <div className="v-grid">
        <h2 className="v-section-title">Awaiting Wallet Signature</h2>
        <LoadingSpinner message="Approve the mint request in your wallet to lock the mint fee." />
      </div>
    );
  }

  if (status === "finalizing") {
    return (
      <div className="v-grid">
        <h2 className="v-section-title">Submitting Transaction</h2>
        <LoadingSpinner message="Finalising the attestation with the protocol admin..." />
        {requestDigest && <div className="v-muted v-small">Mint request digest: {requestDigest}</div>}
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
          <button
            onClick={() => {
              resetError();
              setStatus("idle");
            }}
            className="v-btn-primary"
          >
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
  Your Suirify attestation has been minted successfully. It should appear in your wallet momentarily.
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
