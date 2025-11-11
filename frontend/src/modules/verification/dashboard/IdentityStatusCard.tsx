import React from "react";
import { calculateDaysUntilExpiry } from "@/lib/identityUtils";

const IdentityStatusCard: React.FC<{ attestation: any }> = ({ attestation }) => {
  const fields = attestation?.data?.content?.fields || attestation?.content?.fields || {};
  const status = String(fields.status || "ACTIVE");
  const statusMap: any = {
    ACTIVE: { label: "Active", className: { color: "#10b981" } },
    EXPIRED: { label: "Expired", className: { color: "#ef4444" } },
    REVOKED: { label: "Revoked", className: { color: "#ef4444" } },
    PENDING_BURN: { label: "Pending Deletion", className: { color: "#f59e0b" } },
  };
  const statusInfo = statusMap[status] || statusMap.ACTIVE;

  const objectId = attestation?.data?.objectId || attestation?.objectId || "";

  return (
    <div style={{ background: "#0b1220", color: "#e5e7eb", padding: 16, borderRadius: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 style={{ fontSize: 18, fontWeight: 600 }}>Your Digital Identity</h3>
        <span style={statusInfo.className}>{statusInfo.label}</span>
      </div>

      <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <label>Verification Level</label>
          <span style={{ background: "#111827", padding: "2px 8px", borderRadius: 999 }}>
            L{fields.verification_level || 1}
          </span>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <label>Attestation ID</label>
          <div>
            {objectId ? `${objectId.slice(0, 8)}...${objectId.slice(-8)}` : "Unknown"}
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <label>Issued Date</label>
          <span>
            {fields.issue_time_ms ? new Date(parseInt(String(fields.issue_time_ms))).toLocaleDateString() : "-"}
          </span>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <label>Expires</label>
          <span>
            {fields.expiry_time_ms ? `${calculateDaysUntilExpiry(fields.expiry_time_ms)} days` : "-"}
          </span>
        </div>

        <div>
          <h4>Verified Claims:</h4>
          <div style={{ display: "grid", gap: 6 }}>
            <div>👤 Human Verified: {fields.is_human_verified ? "✓" : "✗"}</div>
            <div>🔞 Over 18: {fields.is_over_18 ? "✓" : "✗"}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IdentityStatusCard;
