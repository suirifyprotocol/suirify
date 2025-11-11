import React from "react";
import { exportVerificationProof } from "@/lib/identityUtils";

/**
 * QuickActionsPanel
 * - Shows common actions (renew, upgrade, export proof, consent mgmt).
 */
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
    <div className="v-card">
      <h3 className="v-card-title v-margin-bottom">Quick Actions</h3>
      <div className="v-actions-grid">
        {actions.map((action, idx) => (
          <button key={idx} onClick={action.action} disabled={!action.enabled} className={`v-action-card ${!action.enabled ? 'v-btn-disabled' : ''}`}>
            <div className="v-action-icon">{action.icon}</div>
            <div className="v-action-label">{action.label}</div>
            <div className="v-action-desc">{action.description}</div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default QuickActionsPanel;
