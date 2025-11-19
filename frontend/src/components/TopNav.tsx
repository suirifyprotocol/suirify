import React from "react";
import { ConnectButton } from "@mysten/dapp-kit";

/**
 * TopNav
 * - Minimal verification navbar that only shows the ConnectButton centered at
 *   the top of the page so wallet actions stay accessible without extra chrome.
 */
const TopNav: React.FC = () => {
  return (
    <header className="verification-connect-nav">
      <ConnectButton
        className="suirify-connect-btn"
        connectText="Connect wallet"
        style={{
          backgroundColor: "hsla(166, 100%, 93%, 1)",
          color: "hsla(229, 19%, 22%, 1)",
        }}
      />
    </header>
  );
};

export default TopNav;
