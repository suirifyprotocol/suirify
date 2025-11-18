import React, { useEffect, useRef, useState } from "react";
import { ConnectButton, useCurrentAccount } from "@mysten/dapp-kit";
import "@mysten/dapp-kit/dist/index.css";
import { useNavigate } from "react-router-dom";

/*
  VerifyDropdown
  Simple interactive element that toggles between a CTA button and the wallet ConnectButton
  once the user activates verification. Comments explain behavior at the component level.
*/
const VerifyDropdown = () => {
  const [isHovering, setIsHovering] = useState(false);
  const account = useCurrentAccount();
  const navigate = useNavigate();
  const connectButtonRef = useRef(null);

  useEffect(() => {
    if (account?.address) {
      navigate("/verify");
    }
  }, [account?.address, navigate]);

  const triggerConnect = () => {
    const button = connectButtonRef.current?.querySelector("button");
    if (button) {
      button.click();
    }
  };

  return (
    <div style={{ position: "relative", display: "inline-block", textAlign: "left" }}>
      <button
        className="verify-button"
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        onClick={triggerConnect}
      >
        {isHovering ? "Connect Wallet" : "Get Verified"}
      </button>

      <div
        ref={connectButtonRef}
        style={{
          position: "absolute",
          opacity: 0,
          pointerEvents: "none",
          width: 0,
          height: 0,
          overflow: "hidden",
        }}
        aria-hidden="true"
      >
        <ConnectButton />
      </div>
    </div>
  );
};

export default VerifyDropdown;
