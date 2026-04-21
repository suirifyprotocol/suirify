import type { VerificationProgressPayload, VerificationStage } from "@/types/verification";

type VerificationProgressProps = {
  payload: VerificationProgressPayload;
  isAnimated?: boolean;
};

const statusLabel: Record<VerificationStage["status"], string> = {
  pending: "Pending",
  running: "Running",
  pass: "Pass",
  fail: "Fail",
};

const statusColor: Record<VerificationStage["status"], string> = {
  pending: "#64748b",
  running: "#f59e0b",
  pass: "#16a34a",
  fail: "#dc2626",
};

const statusIcon: Record<VerificationStage["status"], string> = {
  pending: "...",
  running: "~",
  pass: "OK",
  fail: "X",
};

const formatConfidence = (value?: number) => {
  if (value === undefined || Number.isNaN(value)) return "-";
  return `${(value * 100).toFixed(1)}%`;
};

export function VerificationProgress({ payload, isAnimated = true }: VerificationProgressProps) {
  return (
    <section
      aria-label="Verification pipeline progress"
      aria-live="polite"
      style={{
        border: "1px solid rgba(148, 163, 184, 0.35)",
        borderRadius: 16,
        padding: 16,
        background: "rgba(15, 23, 42, 0.92)",
      }}
    >
      <header style={{ marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontSize: 18 }}>AI Verification Pipeline</h3>
        <p style={{ margin: "6px 0 0", color: "#94a3b8", fontSize: 13 }}>
          Rules Engine Result: {payload.rulesEngineResult ?? "PENDING"}
        </p>
      </header>

      <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 10 }}>
        {payload.stages.map((stage, index) => {
          const color = statusColor[stage.status];
          return (
            <li
              key={stage.id}
              aria-label={`${stage.label} ${statusLabel[stage.status]}`}
              style={{
                border: `1px solid ${color}66`,
                borderRadius: 12,
                padding: "10px 12px",
                background: "rgba(2, 6, 23, 0.55)",
                transform: isAnimated ? "translateY(0)" : undefined,
                transition: "all 240ms ease",
                animation: isAnimated ? `stage-fade 280ms ease ${index * 80}ms both` : undefined,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span
                    aria-hidden="true"
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 999,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 11,
                      fontWeight: 700,
                      color: "#020617",
                      background: color,
                    }}
                  >
                    {statusIcon[stage.status]}
                  </span>
                  <strong style={{ fontSize: 14 }}>{stage.label}</strong>
                </div>
                <span style={{ color, fontSize: 12, fontWeight: 700 }}>{statusLabel[stage.status]}</span>
              </div>

              {(stage.metric || stage.reasonCode) && (
                <div style={{ marginTop: 8, color: "#cbd5e1", fontSize: 12, display: "grid", gap: 4 }}>
                  {stage.metric?.model && <span>Model: {stage.metric.model}</span>}
                  {stage.metric && (
                    <span>
                      Confidence: {formatConfidence(stage.metric.confidence)}
                      {stage.metric.threshold !== undefined ? ` | Threshold: ${stage.metric.threshold}` : ""}
                    </span>
                  )}
                  {stage.reasonCode && <span>Reason: {stage.reasonCode}</span>}
                </div>
              )}
            </li>
          );
        })}
      </ol>

      {isAnimated && (
        <style>{`
          @keyframes stage-fade {
            from {
              opacity: 0;
              transform: translateY(8px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}</style>
      )}
    </section>
  );
}

export default VerificationProgress;
