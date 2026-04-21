import { useMemo, useState } from "react";
import { mockExtensionAnalysisByLanguage } from "@/data/mock/extension";
import type { ExtensionLanguage } from "@/types/extension";

const panelStyle: React.CSSProperties = {
  border: "1px solid rgba(148, 163, 184, 0.35)",
  borderRadius: 14,
  background: "rgba(15, 23, 42, 0.82)",
  padding: 14,
};

export default function ExtensionPreview() {
  const [language, setLanguage] = useState<ExtensionLanguage>("EN");
  const analysis = useMemo(() => mockExtensionAnalysisByLanguage[language], [language]);

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "20px clamp(14px, 3vw, 40px)",
        background: "radial-gradient(circle at top left, #123862 0%, #0f172a 50%, #04070f 100%)",
        color: "#dbeafe",
        display: "grid",
        gap: 16,
      }}
    >
      <header style={{ display: "grid", gap: 8 }}>
        <h1 style={{ margin: 0, fontSize: "clamp(1.3rem, 2vw, 1.8rem)" }}>Suirify Shield Preview</h1>
        <p style={{ margin: 0, color: "#bfdbfe" }}>
          You verified your identity with Suirify. Now let Suirify verify the internet back.
        </p>
      </header>

      <section style={panelStyle}>
        <label htmlFor="language" style={{ display: "block", fontSize: 12, color: "#94a3b8", marginBottom: 8 }}>
          Language
        </label>
        <select
          id="language"
          aria-label="Select analysis language"
          value={language}
          onChange={(event) => setLanguage(event.target.value as ExtensionLanguage)}
          style={{
            borderRadius: 10,
            border: "1px solid #334155",
            background: "#0b1220",
            color: "#e2e8f0",
            padding: "10px",
            fontSize: 13,
          }}
        >
          <option value="EN">EN</option>
          <option value="PIDGIN">Pidgin</option>
          <option value="YORUBA">Yoruba</option>
        </select>
      </section>

      <section style={panelStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <span
            style={{
              border: "1px solid #7dd3fc",
              color: "#bae6fd",
              borderRadius: 999,
              padding: "4px 8px",
              fontSize: 11,
            }}
          >
            Risk Score
          </span>
          <strong style={{ fontSize: 24 }}>{analysis.riskScore}</strong>
        </div>

        <p style={{ margin: "8px 0 0", color: "#cbd5e1", fontSize: 13 }}>{analysis.summary}</p>

        <h2 style={{ fontSize: 16, margin: "14px 0 8px" }}>Flagged Clauses</h2>
        <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 8 }}>
          {analysis.flaggedClauses.map((clause) => (
            <li key={clause.id} style={{ fontSize: 13, lineHeight: 1.4 }}>
              <strong>{clause.clauseTitle}</strong>
              <div style={{ color: "#94a3b8" }}>{clause.ndpaReference}</div>
              <div style={{ color: "#cbd5e1" }}>{clause.recommendation}</div>
            </li>
          ))}
        </ul>

        <div
          style={{
            borderLeft: "3px solid #22d3ee",
            background: "rgba(6, 182, 212, 0.12)",
            padding: 8,
            marginTop: 12,
            color: "#cffafe",
            fontSize: 13,
          }}
        >
          {analysis.suirifyGap}
        </div>
      </section>

      <footer style={{ display: "flex", justifyContent: "center" }}>
        <span
          style={{
            border: "1px solid #0284c7",
            background: "rgba(3, 105, 161, 0.2)",
            color: "#bae6fd",
            borderRadius: 999,
            padding: "6px 10px",
            fontSize: 11,
            fontWeight: 700,
          }}
        >
          Powered by Microsoft Azure
        </span>
      </footer>
    </main>
  );
}
