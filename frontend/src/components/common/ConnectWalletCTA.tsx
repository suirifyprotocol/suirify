import React, { useCallback, useEffect, useRef, useState } from "react";
import { ConnectButton, useCurrentAccount } from "@mysten/dapp-kit";
import "@mysten/dapp-kit/dist/index.css";
import { useNavigate } from "react-router-dom";

interface ConnectWalletCTAProps {
  idleText?: string;
  hoverText?: string;
  className?: string;
  style?: React.CSSProperties;
  containerStyle?: React.CSSProperties;
  redirectPath?: string;
  onComplete?: () => void;
  ariaLabel?: string;
}

const ConnectWalletCTA: React.FC<ConnectWalletCTAProps> = ({
  idleText = "Get Verified",
  hoverText = "Connect Wallet",
  className,
  style,
  containerStyle,
  redirectPath = "/verify",
  onComplete,
  ariaLabel,
}) => {
  const account = useCurrentAccount();
  const navigate = useNavigate();
  const connectButtonRef = useRef<HTMLDivElement>(null);
  const [isHovering, setIsHovering] = useState(false);
  const [shouldNavigate, setShouldNavigate] = useState(false);

  const completeFlow = useCallback(() => {
    if (onComplete) {
      onComplete();
    } else if (redirectPath) {
      navigate(redirectPath);
    }
  }, [navigate, onComplete, redirectPath]);

  const triggerConnect = useCallback(() => {
    const hiddenButton = connectButtonRef.current?.querySelector("button");
    if (hiddenButton) {
      hiddenButton.click();
    } else {
      completeFlow();
    }
  }, [completeFlow]);

  const handleClick = () => {
    if (account?.address) {
      completeFlow();
      return;
    }
    setShouldNavigate(true);
    triggerConnect();
  };

  useEffect(() => {
    if (account?.address && shouldNavigate) {
      completeFlow();
      setShouldNavigate(false);
    }
  }, [account?.address, completeFlow, shouldNavigate]);

  return (
    <div style={{ position: "relative", display: "inline-block", ...containerStyle }}>
      <button
        type="button"
        className={className}
        style={style}
        onClick={handleClick}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        aria-label={ariaLabel}
      >
        {isHovering ? hoverText : idleText}
      </button>
      <div
        ref={connectButtonRef}
        style={{ position: "absolute", opacity: 0, pointerEvents: "none", width: 0, height: 0, overflow: "hidden" }}
        aria-hidden="true"
      >
        <ConnectButton />
      </div>
    </div>
  );
};

export default ConnectWalletCTA;
