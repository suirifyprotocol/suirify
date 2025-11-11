import { useState } from "react";
import suiLogo from "../assets/suilogo.png";
import object from "../assets/object.png";
import Cont from "../components/conText";
import Compliance from "./compliance";
import VerifyDropdown from "./VerifyDropdown";

/*
  Index page - Landing page for SUIrify.
  Renders header, hero and main content sections. Component-level and
  section-level comments are used to document intent and structure.
*/
const Index = () => {
  const [showResourcesDropdown, setShowResourcesDropdown] = useState(false);

  return (
    <>
      {/* Header / Navigation */}
      <div className="hero">
        <header className="header">
          <div className="logo">
            <img src={suiLogo} alt="Sui Logo" />
          </div>

          <nav className="nav-menu">
            <a href="#how-it-works" className="nav-link">
              How It Works
            </a>
            <a href="#developers" className="nav-link">
              Developers
            </a>

            <div
              className="nav-link resources-dropdown"
              onMouseEnter={() => setShowResourcesDropdown(true)}
              onMouseLeave={() => setShowResourcesDropdown(false)}
            >
              Resources ▾
            </div>

            <a href="#faqs" className="nav-link">
              FAQ'S
            </a>
          </nav>

          <button className="cta-button">Build with SUIrify</button>
        </header>

        {/* Hero content */}
        <main className="hero-content">
          <h1 className="hero-title">
            <span className="title-white">The First</span>
            <br />
            <span className="title-blue">Regulatory-Native</span>
            <br />
            <span className="title-white">Identity Protocol</span>
          </h1>

          <p className="hero-subtitle">
            The Sovereign Bridge for Web3. We provide enterprise-grade, compliance-first identity
            <br />
            infrastructure so you can focus on building.
          </p>

          <VerifyDropdown />
        </main>
      </div>

      {/* Main site content */}
      <main className="site-content">
        <section>
          <h2>WEB-3 Identity is Broken</h2>

          <div className="picture">
            <img className="pin-bottom" src={object} alt="Character Logo" />

            <p className="web-content">
              <span className="dox">DOXXING</span>
              <br />Doxxing in Web3 is publicly revealing a pseudonymous user’s real identity or sensitive
              information, undermining privacy, anonymity, and decentralization principles.
            </p>

            <p className="web-anonymity">
              <span className="dox">ANONYMITY</span>
              <br />Anonymity in Web3 ensures users interact pseudonymously, protecting identities,
              reducing tracking, and preserving privacy within decentralized blockchain ecosystems.
            </p>

            <p className="web-centralisation">
              <span className="dox">CENTRALISATION</span>
              <br />Centralisation in Web3 occurs when power, governance, or control concentrates in
              few entities, undermining decentralization, openness, and user sovereignty principles.
            </p>
          </div>
        </section>
      </main>

      {/* Compliance section (separate component) */}
      <section>
        <Compliance />
      </section>
    </>
  );
};

export default Index;
