import { useEffect, useState } from "react";
import { mockComplianceDashboardData } from "@/data/mock/dashboard";
import { getComplianceDashboardData } from "@/lib/hackathonDataService";
import type { ComplianceDashboardData } from "@/types/dashboard";

const panelStyle: React.CSSProperties = {
  border: "1px solid rgba(148, 163, 184, 0.35)",
  borderRadius: 14,
  background: "rgba(15, 23, 42, 0.8)",
  padding: 14,
};

const formatPct = (value: number) => `${(value * 100).toFixed(1)}%`;
const formatTime = (timestamp: number) => new Date(timestamp).toLocaleTimeString();

const chipStyle: React.CSSProperties = {
  borderRadius: 999,
  padding: "6px 10px",
  fontSize: 11,
  fontWeight: 700,
  border: "1px solid rgba(148, 163, 184, 0.35)",
  background: "rgba(15, 23, 42, 0.78)",
  color: "#bae6fd",
};

export default function ComplianceDashboard() {
  const [data, setData] = useState<ComplianceDashboardData>(mockComplianceDashboardData);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    getComplianceDashboardData()
      .then((result) => {
        if (mounted) setData(result);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#020617", color: "#cbd5e1" }}>
        <p>Loading compliance dashboard...</p>
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "20px clamp(14px, 3vw, 40px)",
        background: "radial-gradient(circle at 20% 0%, #11284a 0%, #0b1220 55%, #060b13 100%)",
        color: "#e2e8f0",
        display: "grid",
        gap: 16,
      }}
    >
      <header style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "clamp(1.3rem, 2vw, 1.8rem)" }}>Compliance Officer Dashboard</h1>
          <p style={{ margin: "6px 0 0", color: "#94a3b8" }}>
            Platform: {data.platformId} | Last Updated: {new Date(data.generatedAt).toLocaleString()}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <span style={chipStyle}>Mock-first demo</span>
          <span style={chipStyle}>Zero PII enforced</span>
          <button
            type="button"
            aria-label="Export audit pack"
            style={{
              border: "1px solid #38bdf8",
              borderRadius: 10,
              background: "#082f49",
              color: "#e0f2fe",
              padding: "10px 14px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Export Audit Pack
          </button>
        </div>
      </header>

      <section style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        <article style={panelStyle}>
          <p style={{ margin: 0, color: "#94a3b8", fontSize: 12 }}>KYC Rate</p>
          <h2 style={{ margin: "8px 0 0", fontSize: 24 }}>{formatPct(data.kycRate)}</h2>
        </article>
        <article style={panelStyle}>
          <p style={{ margin: 0, color: "#94a3b8", fontSize: 12 }}>Active Attestations</p>
          <h2 style={{ margin: "8px 0 0", fontSize: 24 }}>{data.activeAttestations.toLocaleString()}</h2>
        </article>
        <article style={panelStyle}>
          <p style={{ margin: 0, color: "#94a3b8", fontSize: 12 }}>Expired Attestations</p>
          <h2 style={{ margin: "8px 0 0", fontSize: 24 }}>{data.expiredAttestations.toLocaleString()}</h2>
        </article>
        <article style={panelStyle}>
          <p style={{ margin: 0, color: "#94a3b8", fontSize: 12 }}>Failed Verifications</p>
          <h2 style={{ margin: "8px 0 0", fontSize: 24 }}>{data.failedVerifications.toLocaleString()}</h2>
        </article>
      </section>

      <section style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
        <article style={panelStyle}>
          <h3 style={{ marginTop: 0 }}>AI Confidence Monitoring</h3>
          <div style={{ display: "grid", gap: 10 }}>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, color: "#cbd5e1", fontSize: 12 }}>
                <span>Azure Face Match Avg</span>
                <strong>{formatPct(data.avgFaceMatchConfidence)}</strong>
              </div>
              <div style={{ height: 8, borderRadius: 999, background: "#1e293b" }}>
                <div style={{ width: formatPct(data.avgFaceMatchConfidence), height: "100%", borderRadius: 999, background: "linear-gradient(90deg, #0ea5e9, #22d3ee)" }} />
              </div>
            </div>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, color: "#cbd5e1", fontSize: 12 }}>
                <span>Azure Liveness Avg</span>
                <strong>{formatPct(data.avgLivenessConfidence)}</strong>
              </div>
              <div style={{ height: 8, borderRadius: 999, background: "#1e293b" }}>
                <div style={{ width: formatPct(data.avgLivenessConfidence), height: "100%", borderRadius: 999, background: "linear-gradient(90deg, #22c55e, #86efac)" }} />
              </div>
            </div>
          </div>
        </article>

        <article style={panelStyle}>
          <h3 style={{ marginTop: 0 }}>Monthly Verification Volume</h3>
          <div style={{ display: "grid", gap: 8 }}>
            {data.monthlyVolume.map((point) => {
              const barWidth = Math.max(8, (point.verifiedCount / 380) * 100);
              return (
                <div key={point.month} style={{ display: "grid", gap: 4 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#cbd5e1" }}>
                    <span>{point.month}</span>
                    <span>
                      Verified {point.verifiedCount} | Failed {point.failedCount}
                    </span>
                  </div>
                  <div style={{ height: 8, borderRadius: 999, background: "#1e293b" }}>
                    <div
                      style={{
                        width: `${barWidth}%`,
                        height: "100%",
                        borderRadius: 999,
                        background: "linear-gradient(90deg, #0891b2, #22d3ee)",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </article>
      </section>

      <section style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}>
        <article style={panelStyle}>
          <h3 style={{ marginTop: 0 }}>Framework Crosswalk</h3>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", paddingBottom: 8 }}>Framework</th>
                  <th style={{ textAlign: "left", paddingBottom: 8 }}>Pass Rate</th>
                  <th style={{ textAlign: "left", paddingBottom: 8 }}>Required Claims</th>
                </tr>
              </thead>
              <tbody>
                {data.frameworkCoverage.map((row) => (
                  <tr key={row.frameworkId}>
                    <td style={{ padding: "6px 0", color: "#e2e8f0" }}>{row.frameworkId}</td>
                    <td style={{ padding: "6px 0", color: "#22d3ee", fontWeight: 700 }}>{formatPct(row.passRate)}</td>
                    <td style={{ padding: "6px 0", color: "#94a3b8" }}>{row.requiredClaims.join(", ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article style={panelStyle}>
          <h3 style={{ marginTop: 0 }}>Recent Failures Log</h3>
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 8 }}>
            {data.recentFailures.map((row) => (
              <li key={row.id} style={{ border: "1px solid #334155", borderRadius: 10, padding: 10 }}>
                <p style={{ margin: 0, fontWeight: 700 }}>{row.errorCode}</p>
                <p style={{ margin: "4px 0 0", color: "#94a3b8", fontSize: 12 }}>
                  {formatTime(row.timestamp)} | Rules: {row.rulesEngineResult}
                </p>
                <p style={{ margin: "4px 0 0", color: "#cbd5e1", fontSize: 12 }}>
                  Face: {row.faceMatchConfidence ? formatPct(row.faceMatchConfidence) : "-"} | Liveness: {row.livenessConfidence ? formatPct(row.livenessConfidence) : "-"}
                </p>
                <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <span style={chipStyle}>Confidence-driven</span>
                  <span style={chipStyle}>{row.platformId}</span>
                </div>
              </li>
            ))}
          </ul>
        </article>
      </section>

      <section style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
        <article style={panelStyle}>
          <h3 style={{ marginTop: 0 }}>Audit Pack Status</h3>
          <p style={{ margin: "8px 0 0", color: data.auditPackReady ? "#86efac" : "#fca5a5", fontWeight: 700 }}>
            {data.auditPackReady ? "Ready for export" : "Not ready"}
          </p>
          <p style={{ margin: "6px 0 0", color: "#cbd5e1", fontSize: 13 }}>
            Demo-safe bundle with evidence, confidence metrics, and framework coverage.
          </p>
        </article>

        <article style={panelStyle}>
          <h3 style={{ marginTop: 0 }}>Zero PII Guardrail</h3>
          <p style={{ margin: "8px 0 0", color: "#cbd5e1", fontSize: 13 }}>
            No wallet addresses, names, or personal identifiers are shown anywhere in this view.
          </p>
        </article>
      </section>
    </main>
  );
}
