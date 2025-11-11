import React from "react";
import { ConnectButton } from "@mysten/dapp-kit";
import { Link } from "react-router-dom";
import suiLogo from "../assets/suilogo.png";

/**
 * TopNav
 * - Header used only inside the verification flow pages.
 * - It renders the `ConnectButton` on the top-right; the button itself
 *   already shows the connected address and the disconnect action,
 *   so we don't duplicate the address here.
 */
const TopNav: React.FC = () => {
  return (
    <header className="header" style={{ alignItems: "center" }}>
      <div className="logo">
        <Link to="/"><img src={suiLogo} alt="Sui Logo" /></Link>
      </div>

      <nav className="nav-menu" style={{ alignItems: "center" }}>
        <a href="#how-it-works" className="nav-link">
          How It Works
        </a>
        <a href="#developers" className="nav-link">
          Developers
        </a>
        <div className="nav-link resources-dropdown">Resources ▾</div>
        <a href="#faqs" className="nav-link">
          FAQ'S
        </a>
      </nav>

      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <ConnectButton />
      </div>
    </header>
  );
};

export default TopNav;
