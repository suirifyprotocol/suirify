import { useEffect, useMemo, useState } from "react";
import { mockRegulatorDashboardData } from "@/data/mock/dashboard";
import { getRegulatorDashboardData } from "@/lib/hackathonDataService";
import type { FraudSignalItem } from "@/types/dashboard";

const panelStyle: React.CSSProperties = {
  border: "1px solid rgba(148, 163, 184, 0.35)",
  borderRadius: 14,
  background: "rgba(15, 23, 42, 0.8)",
  padding: 14,
};

const formatPct = (value: number) => `${(value * 100).toFixed(1)}%`;
const formatTime = (timestamp: number) => new Date(timestamp).toLocaleTimeString();

const badgeStyle: React.CSSProperties = {
  border: "1px solid #22d3ee",
  borderRadius: 999,
  background: "rgba(34, 211, 238, 0.12)",
  color: "#67e8f9",
  fontWeight: 700,
  fontSize: 12,
  padding: "8px 12px",
};

function rotateSignals(signals: FraudSignalItem[]): FraudSignalItem[] {
  if (signals.length < 2) return signals;
  return [...signals.slice(1), signals[0]];
}

export default function RegulatorDashboard() {
  const [data, setData] = useState(mockRegulatorDashboardData);
  const [loading, setLoading] = useState(true);
  const [signals, setSignals] = useState(data.liveFraudSignals);

  useEffect(() => {
    let mounted = true;
    getRegulatorDashboardData()
      .then((result) => {
        if (!mounted) return;
        setData(result);
        setSignals(result.liveFraudSignals);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSignals((current) => rotateSignals(current));
    }, 5000);
    return () => window.clearInterval(timer);
  }, []);

  const frameworkRows = useMemo(() => Object.entries(data.frameworkSummary), [data.frameworkSummary]);

  if (loading) {
    return (
      <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#020617", color: "#cbd5e1" }}>
        <p>Loading regulator dashboard...</p>
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "20px clamp(14px, 3vw, 40px)",
        background: "radial-gradient(circle at 90% -10%, #1f2937 0%, #0f172a 50%, #020617 100%)",
        color: "#e2e8f0",
        display: "grid",
        gap: 16,
      }}
    >
      <header style={{ display: "grid", gap: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: "clamp(1.3rem, 2vw, 1.8rem)" }}>Regulator SupTech Dashboard</h1>
            <p style={{ margin: "6px 0 0", color: "#94a3b8" }}>Ecosystem-wide posture with zero personally identifiable data.</p>
          </div>
          <span style={badgeStyle}>{data.zeroPiiBadgeText}</span>
        </div>
      </header>

      <section style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" }}>
        <article style={panelStyle}>
          <p style={{ margin: 0, fontSize: 12, color: "#94a3b8" }}>Total Verified Users</p>
          <h2 style={{ margin: "8px 0 0", fontSize: 24 }}>{data.ecosystem.totalVerifiedUsers.toLocaleString()}</h2>
        </article>
        <article style={panelStyle}>
          <p style={{ margin: 0, fontSize: 12, color: "#94a3b8" }}>Integrated Platforms</p>
          <h2 style={{ margin: "8px 0 0", fontSize: 24 }}>{data.ecosystem.integratedPlatforms}</h2>
        </article>
        <article style={panelStyle}>
          <p style={{ margin: 0, fontSize: 12, color: "#94a3b8" }}>Compliance Rate</p>
          <h2 style={{ margin: "8px 0 0", fontSize: 24 }}>{formatPct(data.ecosystem.complianceRate)}</h2>
        </article>
        <article style={panelStyle}>
          <p style={{ margin: 0, fontSize: 12, color: "#94a3b8" }}>Fraud Signals</p>
          <h2 style={{ margin: "8px 0 0", fontSize: 24 }}>{data.ecosystem.fraudSignals}</h2>
        </article>
      </section>

      <section style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}>
        <article style={panelStyle}>
          <h3 style={{ marginTop: 0 }}>Platform Compliance Heatmap</h3>
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 8 }}>
            {data.platformCompliance.map((row) => {
              const scoreWidth = `${Math.max(8, Math.round(row.complianceScore * 100))}%`;
              return (
                <li key={row.platformId} style={{ border: "1px solid #334155", borderRadius: 10, padding: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                    <strong>{row.platformId}</strong>
                    <span>{formatPct(row.complianceScore)}</span>
                  </div>
                  <div style={{ marginTop: 6, height: 8, borderRadius: 999, background: "#1e293b" }}>
                    <div
                      style={{
                        width: scoreWidth,
                        height: "100%",
                        borderRadius: 999,
                        background: "linear-gradient(90deg, #0ea5e9, #22c55e)",
                      }}
                    />
                  </div>
                  <p style={{ margin: "6px 0 0", color: "#94a3b8", fontSize: 12 }}>
                    Verifications: {row.verificationCount.toLocaleString()} | Fraud signals: {row.fraudSignals}
                  </p>
                </li>
              );
            })}
          </ul>
        </article>

        <article style={panelStyle}>
          <h3 style={{ marginTop: 0 }}>Live AI Fraud Signals (auto refresh 5s)</h3>
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 8 }}>
            {signals.map((signal) => (
              <li key={signal.id} style={{ border: "1px solid #334155", borderRadius: 10, padding: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <strong>{signal.signalType}</strong>
                  <span style={{ color: signal.severity === "high" ? "#f87171" : signal.severity === "medium" ? "#facc15" : "#38bdf8" }}>
                    {signal.severity.toUpperCase()}
                  </span>
                </div>
                <p style={{ margin: "4px 0 0", color: "#94a3b8", fontSize: 12 }}>
                  Platform: {signal.platformId} | {formatTime(signal.timestamp)}
                </p>
                <p style={{ margin: "4px 0 0", color: "#cbd5e1", fontSize: 12 }}>
                  Azure confidence: {formatPct(signal.confidence)} | Rules Engine: FLAGGED
                </p>
                <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <span style={badgeStyle}>{signal.severity.toUpperCase()}</span>
                  <span style={badgeStyle}>{signal.platformId}</span>
                </div>
              </li>
            ))}
          </ul>
        </article>
      </section>

      <section style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}>
        <article style={panelStyle}>
          <h3 style={{ marginTop: 0 }}>Expiring Attestation Alerts</h3>
          <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 6 }}>
            {data.expiringAlerts.map((alert) => (
              <li key={alert.platformId}>
                <span style={{ color: "#cbd5e1" }}>{alert.platformId}</span>
                <span style={{ color: "#94a3b8" }}> {"->"} {alert.count} expiring in {alert.expiringInDays} days</span>
              </li>
            ))}
          </ul>
        </article>

        <article style={panelStyle}>
          <h3 style={{ marginTop: 0 }}>Framework Compliance Summary</h3>
          <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 6 }}>
            {frameworkRows.map(([frameworkId, score]) => (
              <li key={frameworkId}>
                <span style={{ color: "#cbd5e1" }}>{frameworkId}</span>
                <span style={{ color: "#22d3ee", fontWeight: 700 }}> {"->"} {formatPct(score)}</span>
              </li>
            ))}
          </ul>
        </article>
      </section>

      <footer
        style={{
          borderTop: "1px solid #334155",
          paddingTop: 10,
          color: "#67e8f9",
          fontSize: 12,
          fontWeight: 700,
          display: "flex",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <span>{data.zeroPiiBadgeText}</span>
        <span>Generated: {new Date(data.generatedAt).toLocaleString()}</span>
      </footer>
    </main>
  );
}
