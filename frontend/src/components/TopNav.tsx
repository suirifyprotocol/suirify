import React from "react";
import { ConnectButton } from "@mysten/dapp-kit";
import suiLogo from "@/assets/suilogo.png";

const TopNav: React.FC = () => {
  return (
    <header className="header verification-top-nav">
      <div className="logo">
        <a href="/" aria-label="Suirify home">
          <img src={suiLogo} alt="Suirify logo" />
        </a>
      </div>

      <nav className="nav-menu" aria-label="Primary">
        <a href="/#how-it-works" className="nav-link">
          How It Works
        </a>
        <a href="/#developers" className="nav-link">
          Developers
        </a>
        <span className="nav-link resources-dropdown" aria-hidden="true">
          Resources ▾
        </span>
        <a href="/#faqs" className="nav-link">
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
