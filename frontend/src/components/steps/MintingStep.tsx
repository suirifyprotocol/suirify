import React, { useCallback, useEffect, useState } from "react";
import type { VerificationForm } from "../VerificationPortal";
import LoadingSpinner from "../common/LoadingSpinner";
import { explorer } from "../../lib/config";
import { fetchMintConfig, finalizeMint, lookupMintRequest } from "../../lib/apiService";
import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClient } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { toUserFacingMessage } from "../../lib/errorMessages";

const MintingStep: React.FC<{
  formData: VerificationForm;
  setFormData: React.Dispatch<React.SetStateAction<VerificationForm>>;
  onNext: () => void;
  onBack: () => void;
}> = ({ formData, setFormData, onBack }) => {
  const account = useCurrentAccount();
  const signAndExecute = useSignAndExecuteTransaction();
  const suiClient = useSuiClient();
  const [status, setStatus] = useState<
    "idle" | "configuring" | "requesting" | "finalizing" | "success" | "error"
  >(
    formData.mintDigest ? "success" : "idle"
  );
  const [transactionDigest, setTransactionDigest] = useState(formData.mintDigest || "");
  const [error, setError] = useState("");
  const [requestId, setRequestIdState] = useState<string | null>(formData.mintRequestId ?? null);
  const [requestTxDigest, setRequestTxDigestState] = useState(formData.mintRequestDigest ?? "");

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

  const setRequestTxDigest = useCallback(
    (value: string) => {
      setRequestTxDigestState(value);
      setFormData((prev) => ({
        ...prev,
        mintRequestDigest: value || null,
      }));
    },
    [setFormData]
  );

  const runMintFlow = useCallback(async () => {
    if (!formData.sessionId) {
      setStatus("error");
      setError("Verification session missing or already consumed. Please restart the process.");
      return;
    }
    if (!account?.address) {
      setStatus("error");
      setError("Connect your wallet to sign the transaction.");
      return;
    }

    try {
      setError("");

      setStatus("configuring");

      let currentRequestId = requestId;
      let currentRequestDigest = requestTxDigest;

      if (!currentRequestId) {
        try {
          const existing = await lookupMintRequest(account.address);
          if (existing?.hasRequest && existing.requestId) {
            const digest = existing.requestTxDigest || "";
            setRequestId(existing.requestId);
            setRequestTxDigest(digest);
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
          throw new Error("Protocol configuration is incomplete. Please try again later.");
        }
        const mintFeeMist = config.mintFeeMist ?? config.mintFee;
        if (!mintFeeMist) {
          throw new Error("Mint fee not available. Please contact support.");
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
        const requestDigest = requestResult.digest;
        if (!requestDigest) {
          throw new Error("Mint request transaction did not return a digest.");
        }

        const packageId = config.packageId;
        const txDetails: any = await suiClient.waitForTransaction({
          digest: requestDigest,
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
        setRequestTxDigest(requestDigest);

        currentRequestId = eventRequestId;
        currentRequestDigest = requestDigest;
      }

      if (!currentRequestId) {
        throw new Error("Mint request not available. Please retry the minting step.");
      }

      setStatus("finalizing");
      const finalizeResult = await finalizeMint({
        sessionId: formData.sessionId,
        requestId: currentRequestId,
        requestTxDigest: currentRequestDigest || undefined,
      });

      const digest = finalizeResult.digest;
      if (!digest) throw new Error("Mint finalization did not return a digest.");

      setTransactionDigest(digest);
      setStatus("success");
      setRequestId(null);
      setRequestTxDigest("");
      setFormData((prev) => ({
        ...prev,
        sessionId: null,
        mintDigest: digest,
        mintRequestId: null,
        mintRequestDigest: null,
      }));

      if (typeof window !== "undefined") {
        window.setTimeout(() => {
          window.location.href = "/dashboard";
        }, 3000);
      }
    } catch (err) {
      if (err instanceof Error && (err as Error & { status?: number }).status === 409) {
        setError(err.message || "Wallet already holds an attestation. Please check your dashboard.");
      } else {
        const message = toUserFacingMessage(err, "Failed to mint attestation. Please try again.");
        setError(message);
      }
      setStatus("error");
    }
  }, [
    account,
    formData.sessionId,
    requestId,
    requestTxDigest,
    setFormData,
    setRequestId,
    setRequestTxDigest,
    signAndExecute,
    suiClient,
  ]);

  useEffect(() => {
    if (status === "idle") {
      runMintFlow();
    }
  }, [runMintFlow, status]);

  if (status === "idle" || status === "configuring") {
    return (
      <div>
  <LoadingSpinner message="Minting your Suirify Attestation..." />
        <p>This may take a few moments. Please don't close this window.</p>
      </div>
    );
  }

  if (status === "requesting") {
    return (
      <div>
        <LoadingSpinner message="Approve the mint request in your wallet." />
        <p style={{ color: "#9ca3af" }}>You will be prompted to pay the mint fee.</p>
      </div>
    );
  }

  if (status === "finalizing") {
    return (
      <div>
        <LoadingSpinner message="Finalizing your attestation on-chain..." />
        {requestTxDigest && (
          <p style={{ color: "#9ca3af" }}>
            Mint request submitted (digest: {requestTxDigest.slice(0, 10)}…)
          </p>
        )}
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
  <p>Your Suirify Attestation has been successfully minted.</p>

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
