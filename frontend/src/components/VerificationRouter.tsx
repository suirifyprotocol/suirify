import React, { useEffect, useState } from "react";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { useVerificationStatus } from "../hooks/useVerificationStatus";
import LoadingSpinner from "./common/LoadingSpinner";
import VerificationPortal from "./VerificationPortal";
import Dashboard from "./Dashboard.tsx";
import { ConnectButton } from "@mysten/dapp-kit";

const VerificationRouter: React.FC = () => {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account?.address]);

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

export default VerificationRouter;
