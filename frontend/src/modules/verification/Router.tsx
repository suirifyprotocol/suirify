import React, { useEffect, useState } from "react";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { useVerificationStatus } from "@/hooks/useVerificationStatus";
import LoadingSpinner from "./ui/LoadingSpinner";
import VerificationPortal from "./portal/VerificationPortal";
import Dashboard from "./dashboard/Dashboard";
import { ConnectButton } from "@mysten/dapp-kit";

const Router: React.FC = () => {
  const account = useCurrentAccount();
  const { checkAttestation } = useVerificationStatus();
  const [verificationState, setVerificationState] = useState<
    "checking" | "verified" | "unverified"
  >("checking");

  useEffect(() => {
    const run = async () => {
      if (account?.address) {
        const { isValid } = await checkAttestation(account.address);
        setVerificationState(isValid ? "verified" : "unverified");
      } else {
        setVerificationState("unverified");
      }
    };
    run();
  }, [account?.address, checkAttestation]);

  if (!account) {
    return (
      <div style={{ display: "grid", placeItems: "center", minHeight: "60vh" }}>
        <div style={{ textAlign: "center" }}>
          <h2>Connect your wallet to get started</h2>
          <div style={{ marginTop: 12, display: "inline-block" }}>
            <ConnectButton />
          </div>
        </div>
      </div>
    );
  }

  if (verificationState === "checking") {
    return <LoadingSpinner message="Checking your verification status..." />;
  }

  return verificationState === "verified" ? <Dashboard /> : <VerificationPortal />;
};

export default Router;
