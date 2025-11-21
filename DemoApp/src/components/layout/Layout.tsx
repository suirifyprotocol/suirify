import { ConnectButton } from "@mysten/dapp-kit";
import { FC, ReactNode } from "react";
import { WalletBadge } from "@/components/layout/WalletBadge";
import { useVerification } from "@/context/VerificationContext";
import { VerificationPrompt } from "@/components/modals/VerificationPrompt";
import { ConsentModal } from "@/components/modals/ConsentModal";

interface LayoutProps {
  children: ReactNode;
}

export const Layout: FC<LayoutProps> = ({ children }) => {
  const { status } = useVerification();

  return (
    <div className="layout">
      <header className="layout__header">
        <div>
          <p className="layout__eyebrow">SUIrify Demo</p>
          <h1>Verified Launchpad</h1>
        </div>
        <div className="layout__actions">
          <WalletBadge />
          <ConnectButton className="layout__connect" connectText="Connect Wallet" />
        </div>
      </header>
      <div className="layout__status">
        <span className={`status-pill ${status === "verified" ? "status-pill--ok" : "status-pill--warn"}`}>
          {status === "verified" ? "Verified" : "Verification Required"}
        </span>
      </div>
      <main>{children}</main>
      <VerificationPrompt />
      <ConsentModal />
      <style>{`
        .layout {
          min-height: 100vh;
          max-width: 1200px;
          margin: 0 auto;
          padding: 40px 20px 80px;
        }
        .layout__header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 24px;
          flex-wrap: wrap;
        }
        .layout__eyebrow {
          text-transform: uppercase;
          letter-spacing: 0.2em;
          color: #38bdf8;
          font-size: 0.75rem;
        }
        .layout__actions {
          display: flex;
          gap: 16px;
          align-items: center;
        }
        .layout__connect {
          min-width: 180px;
          justify-content: center;
        }
        .layout__status {
          margin-top: 16px;
        }
        .status-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border-radius: 999px;
          padding: 8px 16px;
          font-weight: 600;
        }
        .status-pill--ok {
          background: rgba(34, 197, 94, 0.18);
          color: #4ade80;
        }
        .status-pill--warn {
          background: rgba(251, 146, 60, 0.18);
          color: #fb923c;
        }
        @media (max-width: 640px) {
          .layout {
            padding: 20px 16px 60px;
          }
          .layout__actions {
            width: 100%;
            justify-content: space-between;
          }
        }
      `}</style>
    </div>
  );
};
