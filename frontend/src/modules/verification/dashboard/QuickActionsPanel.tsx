import React from "react";
import { exportVerificationProof } from "@/lib/identityUtils";

const QuickActionsPanel: React.FC = () => {
  const actions = [
    {
      icon: "🔄",
      label: "Renew Verification",
      description: "Renew your attestation before expiry",
      action: () => (window.location.href = "/renew"),
      enabled: true,
    },
    {
      icon: "⚡",
      label: "Upgrade to L2",
      description: "Add BVN for financial-grade verification",
      action: () => (window.location.href = "/upgrade"),
      enabled: true,
    },
    {
      icon: "📤",
      label: "Export Proof",
      description: "Generate verification proof for dApps",
      action: async () => {
        const proof = await exportVerificationProof();
        alert(`Generated proof: ${proof}`);
      },
      enabled: true,
    },
    {
      icon: "🔒",
      label: "Manage Consent",
      description: "View and revoke dApp access",
      action: () => (window.location.href = "/consent"),
      enabled: true,
    },
  ];

  return (
    <div style={{ background: "#0b1220", color: "#e5e7eb", padding: 16, borderRadius: 12 }}>
      <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>Quick Actions</h3>
      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
        {actions.map((action, idx) => (
          <button
            key={idx}
            onClick={action.action}
            disabled={!action.enabled}
            style={{
              textAlign: "left",
              padding: 12,
              borderRadius: 12,
              background: "#0f172a",
              color: action.enabled ? "#e5e7eb" : "#6b7280",
              border: "1px solid #1f2937",
            }}
          >
            <div style={{ fontSize: 22 }}>{action.icon}</div>
            <div style={{ fontWeight: 600 }}>{action.label}</div>
            <div style={{ color: "#9ca3af", fontSize: 12 }}>{action.description}</div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default QuickActionsPanel;
