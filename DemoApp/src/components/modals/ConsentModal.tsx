import { ShieldCheck } from "lucide-react";
import { useVerification } from "@/context/VerificationContext";

const formatScope = (scope: string) => {
  if (scope === "attestation_lookup") {
    return "Allow this app to look up my SUIrify attestation";
  }
  return `Share ${scope.replace(/_/g, " ")}`;
};

export const ConsentModal = () => {
  const { consentOpen, consentFields, consentProcessing, approveConsent, rejectConsent } = useVerification();

  if (!consentOpen) return null;

  return (
    <div className="consent-modal" role="dialog" aria-modal="true">
      <div className="consent-modal__card">
        <ShieldCheck size={32} className="consent-modal__icon" />
        <h3>Share Verified Claims?</h3>
        <p>We&apos;ll ask your wallet to confirm you consent to:</p>
        <ul>
          {consentFields.map((field) => (
            <li key={field}>{formatScope(field)}</li>
          ))}
        </ul>
        <div className="consent-modal__actions">
          <button onClick={rejectConsent} className="consent-modal__ghost" disabled={consentProcessing}>
            Not Now
          </button>
          <button onClick={approveConsent} className="consent-modal__primary" disabled={consentProcessing}>
            {consentProcessing ? "Awaiting Signature..." : "Approve & Sign"}
          </button>
        </div>
      </div>
      <style>{`
        .consent-modal {
          position: fixed;
          inset: 0;
          background: rgba(3, 7, 18, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 110;
          padding: 16px;
        }
        .consent-modal__card {
          width: min(460px, 100%);
          background: #020617;
          border: 1px solid rgba(148, 163, 184, 0.25);
          border-radius: 24px;
          padding: 32px;
          box-shadow: 0 25px 60px rgba(0, 0, 0, 0.45);
          color: #e2e8f0;
        }
        .consent-modal__icon {
          color: #34d399;
          margin-bottom: 12px;
        }
        .consent-modal ul {
          margin: 16px 0 0;
          padding-left: 18px;
          color: #cbd5f5;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .consent-modal__actions {
          margin-top: 28px;
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          justify-content: center;
        }
        .consent-modal__primary,
        .consent-modal__ghost {
          border-radius: 999px;
          padding: 10px 18px;
          font-weight: 600;
          border: none;
          cursor: pointer;
        }
        .consent-modal__primary {
          background: linear-gradient(90deg, #22d3ee, #3b82f6);
          color: #020617;
        }
        .consent-modal__ghost {
          background: transparent;
          border: 1px solid rgba(148, 163, 184, 0.4);
          color: #e2e8f0;
        }
        button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
};
