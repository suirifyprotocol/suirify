import React, { useEffect, useRef, useState } from "react";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { useVerificationStatus } from "@/hooks/useVerificationStatus";
import LoadingSpinner from "./ui/LoadingSpinner";
import VerificationPortal from "./portal/VerificationPortal";
import Dashboard from "./dashboard/Dashboard";
import { ConnectButton } from "@mysten/dapp-kit";
import { useNavigate } from "react-router-dom";

/**
 * Verification Router (entry for /verify)
 * - Entry point after wallet connects (navigated from VerifyDropdown)
 * - Checks chain for SUIrify attestation and renders:
 *   - Dashboard if valid
 *   - VerificationPortal if missing/expired
 * - If no wallet is connected, prompts for connection.
 */
const Router: React.FC = () => {
  const account = useCurrentAccount();
  const { checkAttestation } = useVerificationStatus();
  const navigate = useNavigate();
  const [verificationState, setVerificationState] = useState<
    "checking" | "verified" | "unverified"
  >("checking");

  const wasConnected = useRef<boolean>(!!account?.address);

  // Redirect to home when wallet disconnects (connected -> undefined)
  useEffect(() => {
    const nowConnected = !!account?.address;
    if (wasConnected.current && !nowConnected) {
      navigate("/");
    }
    wasConnected.current = nowConnected;
  }, [account?.address, navigate]);

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
      <div className="v-center">
        <div className="v-center-col">
          <h2>Connect your wallet to get started</h2>
          <div className="v-margin-top">
            <ConnectButton />
          </div>
        </div>
      </div>
    );
  }

  if (verificationState === "checking") {
    return (
      <LoadingSpinner message="Checking your verification status..." />
    );
  }

  return verificationState === "verified" ? <Dashboard /> : <VerificationPortal />;
};

export default Router;
