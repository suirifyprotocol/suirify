import { FC } from "react";
import { useVerification } from "@/context/VerificationContext";

export const WalletBadge: FC = () => {
  const { walletAddress } = useVerification();

  if (!walletAddress) {
    return (
      <div className="wallet-badge">
        <span>Wallet not connected</span>
      </div>
    );
  }

  const short = `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;

  return (
    <div className="wallet-badge">
      <span>{short}</span>
      <style>{`
        .wallet-badge {
          border-radius: 12px;
          border: 1px solid rgba(148, 163, 184, 0.3);
          padding: 6px 12px;
          font-family: "JetBrains Mono", "Fira Code", monospace;
          font-size: 0.85rem;
          color: #cbd5f5;
        }
      `}</style>
    </div>
  );
};
