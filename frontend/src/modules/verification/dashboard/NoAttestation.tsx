import { Link } from "react-router-dom";
import { useEffect } from "react";
import "./verification.css";
import backgroundImage from "@/assets/attestationbg.png";
import logoImage from "@/assets/suilogo.png";
import { useVerificationUI } from "@/modules/verification/context/VerificationUIContext";
import ConnectWalletCTA from "@/components/common/ConnectWalletCTA";

interface NoAttestationProps {
  onVerify?: () => void;
}

const NoAttestation: React.FC<NoAttestationProps> = ({ onVerify }) => {
  const { setImmersive } = useVerificationUI();

  useEffect(() => {
    document.body.classList.add("verification-immersive");
    setImmersive(true);
    return () => {
      document.body.classList.remove("verification-immersive");
      setImmersive(false);
    };
  }, [setImmersive]);

  return (
    <div className="verification-container" style={{ backgroundImage: `url(${backgroundImage})` }}>
      <div className="verification-overlay" />
      <header className="verification-header">
        <Link to="/" aria-label="Back to Suirify home">
          <img src={logoImage} alt="Suirify logo" className="verification-logo" />
        </Link>
      </header>
      <main className="verification-main">
        <div className="verification-card" role="article" aria-live="polite">
          <h1 className="verification-title">No Attestation Found</h1>
          <p className="verification-subtitle">It seems you don't have a Suirify Attestation yet...</p>
          <ConnectWalletCTA
            className="verification-cta"
            idleText="Get Verified Now"
            hoverText="Connect Wallet"
            ariaLabel="Get verified with Suirify attestation"
            onComplete={onVerify}
          />
        </div>
      </main>
    </div>
  );
};

export default NoAttestation;
