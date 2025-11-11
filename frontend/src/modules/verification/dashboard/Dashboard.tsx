import React, { useEffect, useState } from "react";
import { useCurrentAccount, useSuiClient } from "@mysten/dapp-kit";
import LoadingSpinner from "../ui/LoadingSpinner";
import { STRUCT_ATTESTATION } from "@/lib/config";
import IdentityStatusCard from "./IdentityStatusCard";
import QuickActionsPanel from "./QuickActionsPanel";
import { getLastLocalAttestation } from "@/lib/mockApi";

/**
 * Dashboard
 * - Displays current attestation (from chain or local fallback).
 * - Hosts identity status and quick actions.
 */
const Dashboard: React.FC = () => {
  const account = useCurrentAccount();
  const client = useSuiClient();
  const [attestation, setAttestation] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      if (!account?.address) return setLoading(false);
      try {
        const attestations = await client.getOwnedObjects({
          owner: account.address,
          filter: { StructType: STRUCT_ATTESTATION },
          options: { showContent: true },
        });
        if (attestations.data.length > 0) setAttestation(attestations.data[0]);
        else setAttestation(getLastLocalAttestation());
      } catch (e) {
        setAttestation(getLastLocalAttestation());
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [account?.address, client]);

  if (loading) return <LoadingSpinner message="Loading your dashboard..." />;

  if (!attestation) {
    return (
      <div className="v-center">
        <div>
          <h2>No Attestation Found</h2>
          <p>It seems you don't have a SUIrify attestation yet.</p>
          <button onClick={() => (window.location.href = "/verify")} className="v-btn-primary">
            Get Verified Now
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="v-container">
      <h1 className="v-title">Your Dashboard</h1>
      <div className="v-grid-lg">
        <IdentityStatusCard attestation={attestation} />
        <QuickActionsPanel />
        {/* TODO: Add ConnectedApps, History, Privacy sections */}
      </div>
    </div>
  );
};

export default Dashboard;
