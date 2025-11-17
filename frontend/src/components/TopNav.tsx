import React from "react";
import { ConnectButton } from "@mysten/dapp-kit";
import { Link } from "react-router-dom";
import suiLogo from "../assets/suilogo.png";

/**
 * TopNav
 * - Mirrors the landing page navigation so verification screens keep the same
 *   centered, glassmorphic navbar treatment.
 * - Replaces the landing "Build with Suirify" CTA with the wallet connect
 *   control while keeping link layout identical.
 */
const TopNav: React.FC = () => {
  return (
    <header className="header">
      <div className="logo">
        <Link to="/">
          <img src={suiLogo} alt="Sui Logo" />
        </Link>
      </div>

      <nav className="nav-menu">
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

      <div className="wallet-connect">
        <ConnectButton
          className="suirify-connect-btn"
          connectText="Connect wallet"
          style={{
            backgroundColor: "hsla(166, 100%, 93%, 1)",
            color: "hsla(229, 19%, 22%, 1)",
          }}
        />
      </div>
    </header>
  );
};

export default TopNav;
