import { useMemo, useState } from "react";
import { VerificationProgress, VerificationResultCard } from "@/modules/verification/components";
import {
  mockVerificationFailures,
  mockVerificationProgressRunning,
  mockVerificationProgressSuccess,
  mockVerificationResultSuccess,
} from "@/data/mock";

export default function VerificationQaHarness() {
  const [failureIndex, setFailureIndex] = useState(0);
  const [showSuccess, setShowSuccess] = useState(true);

  const currentFailure = useMemo(() => mockVerificationFailures[failureIndex], [failureIndex]);

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "20px clamp(14px, 3vw, 40px)",
        background: "radial-gradient(circle at 20% -10%, #1e293b 0%, #0f172a 55%, #020617 100%)",
        color: "#e2e8f0",
        display: "grid",
        gap: 16,
      }}
    >
      <header>
        <h1 style={{ margin: 0, fontSize: "clamp(1.3rem, 2vw, 1.8rem)" }}>Verification QA Harness</h1>
        <p style={{ margin: "6px 0 0", color: "#94a3b8" }}>
          Manual testing surface for progress and all required result states.
        </p>
      </header>

      <section style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
        <button
          type="button"
          aria-label="Show success result"
          onClick={() => setShowSuccess(true)}
          style={{
            border: "1px solid #22c55e",
            borderRadius: 10,
            background: showSuccess ? "#14532d" : "#052e16",
            color: "#dcfce7",
            padding: "10px 12px",
            cursor: "pointer",
            fontWeight: 700,
          }}
        >
          Show Success State
        </button>

        <button
          type="button"
          aria-label="Show failure result"
          onClick={() => setShowSuccess(false)}
          style={{
            border: "1px solid #ef4444",
            borderRadius: 10,
            background: !showSuccess ? "#7f1d1d" : "#450a0a",
            color: "#fee2e2",
            padding: "10px 12px",
            cursor: "pointer",
            fontWeight: 700,
          }}
        >
          Show Failure State
        </button>

        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ color: "#94a3b8", fontSize: 12 }}>Failure Code</span>
          <select
            aria-label="Select failure code"
            value={failureIndex}
            onChange={(event) => setFailureIndex(Number(event.target.value))}
            style={{
              borderRadius: 10,
              border: "1px solid #334155",
              background: "#0b1220",
              color: "#e2e8f0",
              padding: "10px",
            }}
          >
            {mockVerificationFailures.map((item, index) => (
              <option key={item.errorCode} value={index}>
                {item.errorCode}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))" }}>
        <VerificationProgress payload={mockVerificationProgressRunning} />
        <VerificationProgress payload={mockVerificationProgressSuccess} />
      </section>

      <section style={{ display: "grid", gap: 12 }}>
        {showSuccess ? (
          <VerificationResultCard result={mockVerificationResultSuccess} onContinue={() => undefined} />
        ) : (
          <VerificationResultCard result={currentFailure} onRetry={() => undefined} />
        )}
      </section>
    </main>
  );
}
