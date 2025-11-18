import React, { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import TopNav from "./TopNav";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { useVerificationUI } from "@/modules/verification/context/VerificationUIContext";

/**
 * VerificationTopNavPortal
 * - Renders `TopNav` when the current route is part of the verification flow
 *   so the navbar and ConnectButton appear on every verification screen.
 * - Also detects wallet disconnect (connected -> disconnected) while the
 *   user is inside verification routes and redirects to `/`.
 */
const VerificationTopNavPortal: React.FC = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const account = useCurrentAccount();
  const wasConnected = useRef<boolean>(!!account?.address);
  const { immersive } = useVerificationUI();

  const inVerificationRoutes = pathname.startsWith("/verify");

  // Redirect to home if the wallet disconnects while in verification routes.
  useEffect(() => {
    const nowConnected = !!account?.address;
    if (wasConnected.current && !nowConnected && inVerificationRoutes) {
      navigate("/");
    }
    wasConnected.current = nowConnected;
  }, [account?.address, inVerificationRoutes, navigate]);

  const legacyOverride = typeof document !== "undefined" && document.body.classList.contains("verification-immersive");

  if (inVerificationRoutes && !immersive && !legacyOverride) return <TopNav />;
  return null;
};

export default VerificationTopNavPortal;
