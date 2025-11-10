import { Link2, Box } from "lucide-react";
import FeatureCard from "@/components/FeatureCard";
import { Button } from "@/components/ui/button";
import suiLogo from "@/assets/sui.png";
import wireframeBg from "@/assets/wireframe-bg.png";
import sovereignImg from "@/assets/Vector.png";
import zeroPiiImg    from "@/assets/Icons.png";
import firstClassImg from "@/assets/first.png";
import chainsImg from "@/assets/chains.png";
import groupImg from "@/assets/Group.png";
import reloadImg from "@/assets/reload.png";
import shieldImg from "@/assets/shield.png";

const Compliance = () => {
  const features = [
    {
      icon: sovereignImg,
      title: "Sovereign Bridge",
      description:
        "We handle the complex legal and technical work of integrating with government identity databases, abstracting it all away for you.",
    },
    {
      icon: zeroPiiImg,
      title: "Zero PII Storage",
      description:
        "Our privacy-first architecture ensures Personal Identifiable Information exists only in ephemeral memory and is purged instantly after verification.",
    },
    {
      icon: firstClassImg,
      title: "First-Class Object",
      description:
        "On Sui, a user's identity is a tangible digital asset they truly own, enabling powerful new on-chain interactions.",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 md:py-32">
        <div className="max-w-5xl mx-auto text-center space-y-8">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight suirify-heading">
            <span className="text-primary">SUlrify</span>
            <span className="text-foreground">: Compliance By Design.</span>
          </h1>
          <p className="compliance-text">
            Developers don't want a better cryptographic toolkit; they want their compliance problem<br />
            solved. SUlrify is a vertically integrated Compliance-as-a-Service (CaaS) product that delivers a
            <br />complete solution.
          </p>
        </div>
        <section className="cards-wrapper">
        <div className="cards-grid">
            {features.map((feature, index) => (
            <div key={index} className="card-cell">
                <FeatureCard
                icon={feature.icon}
                title={feature.title}
                description={feature.description}
                />
            </div>
            ))}
        </div>
        </section>
      </section>
      {/* Features Section */}

      {/* Built On Sui Section */}
      <section className="container mx-auto px-4 py-20 md:py-32">
        <div className="max-w-5xl mx-auto text-center space-y-12">
          <div className="flex justify-center mb-8">
            <img src={suiLogo} alt="Sui Logo" className="w-11 h-15 suiLogo" />
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-foreground built">
            Built On Sui
          </h2>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto built-content">
            The Blockchain for Mass Adoption and True Digital Ownership.
          </p>
          
          <div className="cards-wrapper-build">
            <div className="cards-grid-build">
              <p className="text-muted-foreground leading-relaxed">
                <span className="lead-text">Object-Centric by Design:</span> Sui's model makes your identity a true digital asset you own and control, not just a line of data in a smart contract.
              </p>
            </div>
            <div className="cards-grid-build">
              <p className="text-muted-foreground leading-relaxed">
                <span className="lead-text">Built for Mainstream Users:</span> Integrated zkLogin allows users to create a self-custody wallet with a simple social login, solving the biggest barrier to Web3 adoption
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* The Stripe For Identity Verification Section */}
      <section className="stripe-section">
        <div className="stripe-grid">
          {/* Left Side - Content */}
          <div className="stripe-left">
            <h2 className="stripe-title">The Stripe For Identity Verification.</h2>
            <p className="stripe-subtext">
              Integrate robust, compliant identity verification in minutes, not months.
              Our developer-friendly SDKs and APIs provide enterprise-grade reliability
              with regulatory compliance built-in.
            </p>
            <Button size="lg" className="explore-docs-btn">Explore the Docs</Button>
          </div>

          {/* Right Side - Feature Grid */}
          <div className="stripe-features">
            <div className="stripe-card">
              <div className="stripe-icon"><img src={chainsImg} alt="Chains" className="w-8 h-8" /></div>
              <h3>On-chain transparency for a trust-minimized audit trail</h3>
              <p>Ensure open, verifiable accountability with on-chain data and transparent records.</p>
            </div>

            <div className="stripe-card">
              <div className="stripe-icon"><img src={groupImg} alt="Group" className="w-8 h-8" /></div>
              <h3>Developer-friendly SDKs & APIs</h3>
              <p>Empower developers with easy-to-use SDKs, clean APIs, and seamless integration.</p>
            </div>

            <div className="stripe-card">
              <div className="stripe-icon"><img src={reloadImg} alt="Reload" className="w-8 h-8" /></div>
              <h3>Versioned attestations for upgradeable identity</h3>
              <p>Maintain evolving digital identities through secure, versioned attestations and updates.</p>
            </div>

            <div className="stripe-card">
              <div className="stripe-icon"><img src={shieldImg} alt="Shield" className="w-8 h-8" /></div>
              <h3>Multi-source verification for robust security</h3>
              <p>Verify users across multiple trusted sources for stronger, fraud-resistant authentication.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Wireframe Background Section */}
      <section className="relative py-32 md:py-48 overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${wireframeBg})` }}
        />
        <div className="relative container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            {/* Add your content here */}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Compliance;
