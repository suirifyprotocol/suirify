import React, { useEffect, useState } from "react";
import { useCurrentAccount, useSuiClient } from "@mysten/dapp-kit";
import LoadingSpinner from "./common/LoadingSpinner";
import { STRUCT_ATTESTATION } from "../lib/config";
import IdentityStatusCard from "./dashboard/IdentityStatusCard.tsx";
import QuickActionsPanel from "./dashboard/QuickActionsPanel.tsx";
import { fetchAttestation } from "../lib/apiService";

const Dashboard: React.FC = () => {
  const account = useCurrentAccount();
  const client = useSuiClient();
  const [attestation, setAttestation] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const mapBackendAttestation = (data: any) => {
      if (!data) return null;
      const issueMs = data.issueDate ? Date.parse(data.issueDate) : null;
      const expiryMs = data.expiryDate ? Date.parse(data.expiryDate) : null;
      return {
        data: {
          objectId: data.objectId,
          content: {
            fields: {
              verification_level: data.verificationLevel,
              issue_time_ms: issueMs ?? null,
              expiry_time_ms: expiryMs ?? null,
              status: (data.status || "ACTIVE").toUpperCase(),
              is_human_verified: true,
              is_over_18: true,
            },
          },
        },
      };
    };

    const loadFallbackAttestation = async (wallet: string) => {
      try {
        const fallback = await fetchAttestation(wallet);
        if (fallback.hasAttestation && fallback.data) {
          setAttestation(mapBackendAttestation(fallback.data));
        } else {
          setAttestation(null);
        }
      } catch {
        setAttestation(null);
      }
    };

    const run = async () => {
      if (!account?.address) {
        setLoading(false);
        return;
      }

      try {
        const attestations = await client.getOwnedObjects({
          owner: account.address,
          filter: { StructType: STRUCT_ATTESTATION },
          options: { showContent: true },
        });
        if (attestations.data.length > 0) {
          setAttestation(attestations.data[0]);
        } else {
          await loadFallbackAttestation(account.address);
        }
      } catch (e) {
        await loadFallbackAttestation(account.address);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [account?.address, client]);

  if (loading) return <LoadingSpinner message="Loading your dashboard..." />;

  if (!attestation) {
    return (
      <div style={{ display: "grid", placeItems: "center", minHeight: "60vh" }}>
        <div style={{ textAlign: "center" }}>
          <h2>No Attestation Found</h2>
          <p>It seems you don't have a SUIrify attestation yet.</p>
          <button onClick={() => (window.location.href = "/verify")} style={{ padding: "10px 14px", borderRadius: 8, background: "#2563eb", color: "white" }}>
            Get Verified Now
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 960, margin: "24px auto", padding: 16 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Your Dashboard</h1>
      <div style={{ display: "grid", gap: 16 }}>
        <IdentityStatusCard attestation={attestation} />
        <QuickActionsPanel />
        {/* Additional sections like ConnectedApps, History, Privacy could be added similarly */}
      </div>
    </div>
  );
};

export default Dashboard;
