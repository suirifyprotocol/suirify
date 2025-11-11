import React, { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import TopNav from "./TopNav";
import { useCurrentAccount } from "@mysten/dapp-kit";

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

  const inVerificationRoutes =
    pathname.startsWith("/verify") || pathname === "/dashboard" || pathname.startsWith("/dashboard/");

  // Redirect to home if the wallet disconnects while in verification routes.
  useEffect(() => {
    const nowConnected = !!account?.address;
    if (wasConnected.current && !nowConnected && inVerificationRoutes) {
      navigate("/");
    }
    wasConnected.current = nowConnected;
  }, [account?.address, inVerificationRoutes, navigate]);

  if (inVerificationRoutes) return <TopNav />;
  return null;
};

export default VerificationTopNavPortal;
