import React, { useEffect, useState } from "react";
import { ConnectButton, useCurrentAccount } from "@mysten/dapp-kit";
import "@mysten/dapp-kit/dist/index.css";
import { useNavigate } from "react-router-dom";

/*
  VerifyDropdown
  Simple interactive element that toggles between a CTA button and the wallet ConnectButton
  once the user activates verification. Comments explain behavior at the component level.
*/
const VerifyDropdown = () => {
  const [activated, setActivated] = useState(false);
  const account = useCurrentAccount();
  const navigate = useNavigate();

  useEffect(() => {
    if (account?.address) {
      navigate("/verify");
    }
  }, [account?.address, navigate]);

  return (
    <div style={{ position: "relative", display: "inline-block", textAlign: "left" }}>
      {!activated ? (
        <button className="verify-button" onClick={() => setActivated(true)}>
          Get Verified
        </button>
      ) : (
        <div style={{ display: "inline-block" }}>
          <ConnectButton />
        </div>
      )}
    </div>
  );
};

export default VerifyDropdown;
