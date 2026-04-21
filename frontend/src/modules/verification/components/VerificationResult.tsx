import { ERROR_CODE_GUIDANCE, ERROR_CODE_TITLE } from "@/modules/verification/constants/errorCodes";
import type { VerificationResult } from "@/types/verification";

type VerificationResultProps = {
  result: VerificationResult;
  onRetry?: () => void;
  onContinue?: () => void;
};

const formatDateTime = (timestamp: number) =>
  new Date(timestamp).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

export function VerificationResultCard({ result, onRetry, onContinue }: VerificationResultProps) {
  if (result.kind === "failure") {
    const title = ERROR_CODE_TITLE[result.errorCode];
    const guidance = result.guidance || ERROR_CODE_GUIDANCE[result.errorCode];

    return (
      <section
        aria-label="Verification failure result"
        style={{
          border: "1px solid rgba(220, 38, 38, 0.45)",
          borderRadius: 16,
          padding: 16,
          background: "rgba(127, 29, 29, 0.18)",
          display: "grid",
          gap: 10,
        }}
      >
        <h3 style={{ margin: 0, color: "#fecaca" }}>Verification Failed</h3>
        <p style={{ margin: 0, color: "#fee2e2", fontWeight: 600 }}>{title}</p>
        <p style={{ margin: 0, color: "#fecaca" }}>{result.message}</p>
        <p style={{ margin: 0, color: "#fca5a5" }}>Guidance: {guidance}</p>
        <p style={{ margin: 0, color: "#fca5a5", fontSize: 13 }}>
          Rules Engine: {result.rulesEngineResult} | Retryable: {result.retryable ? "YES" : "NO"}
        </p>
        {onRetry && result.retryable && (
          <button
            type="button"
            aria-label="Retry verification"
            onClick={onRetry}
            style={{
              justifySelf: "start",
              border: "1px solid #f87171",
              background: "#7f1d1d",
              color: "#fee2e2",
              borderRadius: 10,
              padding: "10px 14px",
              cursor: "pointer",
            }}
          >
            Retry Verification
          </button>
        )}
      </section>
    );
  }

  return (
    <section
      aria-label="Verification success result"
      style={{
        border: "1px solid rgba(22, 163, 74, 0.45)",
        borderRadius: 16,
        padding: 16,
        background: "rgba(20, 83, 45, 0.2)",
        display: "grid",
        gap: 12,
      }}
    >
      <h3 style={{ margin: 0, color: "#bbf7d0" }}>Verification Complete</h3>
      <p style={{ margin: 0, color: "#dcfce7" }}>
        Attestation ID: <code>{result.attestationId}</code>
      </p>
      <p style={{ margin: 0, color: "#dcfce7" }}>
        Verification Level: {result.verificationLevel} | Expires: {formatDateTime(result.expiresAt)}
      </p>

      <div>
        <strong style={{ color: "#bbf7d0" }}>Claims</strong>
        <ul style={{ margin: "8px 0 0", paddingLeft: 18, color: "#dcfce7" }}>
          {Object.entries(result.claims).map(([name, value]) => (
            <li key={name} aria-label={`${name} ${value ? "pass" : "fail"}`}>
              {name}: {value ? "PASS" : "FAIL"}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <strong style={{ color: "#bbf7d0" }}>Frameworks satisfied</strong>
        <ul style={{ margin: "8px 0 0", paddingLeft: 18, color: "#dcfce7" }}>
          {result.frameworkSatisfied.map((frameworkId) => (
            <li key={frameworkId}>{frameworkId}</li>
          ))}
        </ul>
      </div>

      {onContinue && (
        <button
          type="button"
          aria-label="Continue after successful verification"
          onClick={onContinue}
          style={{
            justifySelf: "start",
            border: "1px solid #4ade80",
            background: "#14532d",
            color: "#dcfce7",
            borderRadius: 10,
            padding: "10px 14px",
            cursor: "pointer",
          }}
        >
          Continue to Dashboard
        </button>
      )}
    </section>
  );
}

export default VerificationResultCard;
