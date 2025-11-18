import React, { useEffect, useState } from "react";
import { useCurrentAccount, useSuiClient } from "@mysten/dapp-kit";
import LoadingSpinner from "./common/LoadingSpinner";
import ConnectWalletCTA from "./common/ConnectWalletCTA";
import { STRUCT_ATTESTATION } from "../lib/config";
import IdentityStatusCard from "./dashboard/IdentityStatusCard.tsx";
import QuickActionsPanel from "./dashboard/QuickActionsPanel.tsx";
import { fetchAttestation } from "../lib/apiService";
import type { AttestationSummary } from "../lib/apiService";
import type { AttestationLike } from "../types/attestation";

const Dashboard: React.FC = () => {
  const account = useCurrentAccount();
  const client = useSuiClient();
  const [attestation, setAttestation] = useState<AttestationLike | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const mapBackendAttestation = (data: AttestationSummary | null): AttestationLike | null => {
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

    const run = async () => {
      if (!account?.address) {
        setLoading(false);
        return;
      }

      let backendHasAttestation = false;

      try {
        const fallback = await fetchAttestation(account.address);
        if (fallback.hasAttestation && fallback.data) {
          setAttestation(mapBackendAttestation(fallback.data));
          backendHasAttestation = true;
          setLoading(false);
        }
      } catch {
        // ignore backend errors here; we'll rely on chain lookup next
      }

      try {
        const attestations = await client.getOwnedObjects({
          owner: account.address,
          filter: { StructType: STRUCT_ATTESTATION },
          options: { showContent: true },
        });
        if (attestations.data.length > 0) {
          const first = attestations.data[0];
          if (first && !first.error) {
            setAttestation(first as AttestationLike);
            backendHasAttestation = true;
            setLoading(false);
          } else if (!backendHasAttestation) {
            setAttestation(null);
          }
        } else if (!backendHasAttestation) {
          setAttestation(null);
        }
      } catch (e) {
        if (!backendHasAttestation) {
          try {
            const fallback = await fetchAttestation(account.address);
            if (fallback.hasAttestation && fallback.data) {
              setAttestation(mapBackendAttestation(fallback.data));
              backendHasAttestation = true;
              setLoading(false);
            } else {
              setAttestation(null);
              setLoading(false);
            }
          } catch {
            setAttestation(null);
            setLoading(false);
          }
        }
      } finally {
        if (!backendHasAttestation) {
          setLoading(false);
        }
      }
    };
    run();
  }, [account?.address, client]);

  if (loading) return <LoadingSpinner message="Loading your dashboard..." />;

  if (!attestation) {
    return (
      <div style={{ display: "grid", placeItems: "center", minHeight: "60vh" }}>
        <div style={{ textAlign: "center" }}>
          <h2 style={{ whiteSpace: "nowrap" }}>No Attestation Found</h2>
          <p>It seems you don't have a Suirify attestation yet.</p>
          <ConnectWalletCTA
            idleText="Get Verified Now"
            hoverText="Connect Wallet"
            onComplete={() => (window.location.href = "/verify")}
            style={{ padding: "10px 14px", borderRadius: 8, background: "#2563eb", color: "white", fontWeight: 600 }}
          />
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
