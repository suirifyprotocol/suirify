import React from "react";
import { calculateDaysUntilExpiry } from "@/lib/identityUtils";

/**
 * IdentityStatusCard
 * - Shows status, verification level, attestation id, dates, and claims.
 */
const IdentityStatusCard: React.FC<{ attestation: any }> = ({ attestation }) => {
  const fields = attestation?.data?.content?.fields || attestation?.content?.fields || {};
  const status = String(fields.status || "ACTIVE");
  const statusMap: any = {
    ACTIVE: { label: "Active", className: "v-badge v-badge-success" },
    EXPIRED: { label: "Expired", className: "v-badge v-badge-danger" },
    REVOKED: { label: "Revoked", className: "v-badge v-badge-danger" },
    PENDING_BURN: { label: "Pending Deletion", className: "v-badge v-badge-warn" },
  };
  const statusInfo = statusMap[status] || statusMap.ACTIVE;

  const objectId = attestation?.data?.objectId || attestation?.objectId || "";

  return (
    <div className="v-card">
      <div className="v-row-space">
        <h3 className="v-card-title">Your Digital Identity</h3>
        <span className={statusInfo.className}>{statusInfo.label}</span>
      </div>

      <div className="v-grid">
        <div className="v-row-space">
          <label>Verification Level</label>
          <span className="v-level-pill">L{fields.verification_level || 1}</span>
        </div>

        <div className="v-row-space">
          <label>Attestation ID</label>
          <div>{objectId ? `${objectId.slice(0, 8)}...${objectId.slice(-8)}` : "Unknown"}</div>
        </div>

        <div className="v-row-space">
          <label>Issued Date</label>
          <span>
            {fields.issue_time_ms ? new Date(parseInt(String(fields.issue_time_ms))).toLocaleDateString() : "-"}
          </span>
        </div>

        <div className="v-row-space">
          <label>Expires</label>
          <span>{fields.expiry_time_ms ? `${calculateDaysUntilExpiry(fields.expiry_time_ms)} days` : "-"}</span>
        </div>

        <div>
          <h4>Verified Claims:</h4>
          <div className="v-grid-narrow">
            <div>👤 Human Verified: {fields.is_human_verified ? "✓" : "✗"}</div>
            <div>🔞 Over 18: {fields.is_over_18 ? "✓" : "✗"}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IdentityStatusCard;
