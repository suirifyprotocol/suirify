import { useVerification } from "@/context/VerificationContext";
import { ShieldAlert } from "lucide-react";

const VERIFY_URL = "https://devnet.suirify.com";

export const VerificationPrompt = () => {
  const { promptOpen, promptMessage, closePrompt } = useVerification();

  if (!promptOpen) return null;

  return (
    <div className="verify-modal" role="dialog" aria-modal="true">
      <div className="verify-modal__card">
        <ShieldAlert size={32} className="verify-modal__icon" />
        <h3>Verification Required</h3>
        <p>{promptMessage}</p>
        <div className="verify-modal__actions">
          <button onClick={closePrompt} className="verify-modal__ghost">
            Maybe Later
          </button>
          <a href={VERIFY_URL} target="_blank" rel="noreferrer" className="verify-modal__primary">
            Get Verified with SUIrify
          </a>
        </div>
      </div>
      <style>{`
        .verify-modal {
          position: fixed;
          inset: 0;
          background: rgba(3, 7, 18, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100;
          padding: 16px;
        }
        .verify-modal__card {
          width: min(420px, 100%);
          background: #020617;
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 24px;
          padding: 32px;
          text-align: center;
          box-shadow: 0 25px 60px rgba(0, 0, 0, 0.45);
        }
        .verify-modal__icon {
          color: #fbbf24;
          margin-bottom: 12px;
        }
        .verify-modal__actions {
          margin-top: 24px;
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          justify-content: center;
        }
        .verify-modal__primary,
        .verify-modal__ghost {
          border-radius: 999px;
          padding: 10px 18px;
          font-weight: 600;
          border: none;
          cursor: pointer;
        }
        .verify-modal__primary {
          background: linear-gradient(90deg, #22d3ee, #3b82f6);
          color: #020617;
          text-decoration: none;
        }
        .verify-modal__ghost {
          background: transparent;
          border: 1px solid rgba(148, 163, 184, 0.4);
          color: #e2e8f0;
        }
      `}</style>
    </div>
  );
};
