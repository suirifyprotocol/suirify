import ConnectWalletCTA from "../components/common/ConnectWalletCTA";

/*
  VerifyDropdown
  Thin wrapper that keeps landing-page styling while delegating wallet-connect logic
  to a shared CTA component for consistency across the app.
*/
const VerifyDropdown = () => {
  return <ConnectWalletCTA className="verify-button" idleText="Get Verified" hoverText="Connect Wallet" />;
};

export default VerifyDropdown;
