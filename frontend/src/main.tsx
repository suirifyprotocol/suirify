import App from "./App.tsx";
import "./index.css";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createNetworkConfig,
  SuiClientProvider,
  WalletProvider,
} from "@mysten/dapp-kit";
import { getFullnodeUrl } from "@mysten/sui/client";

const { networkConfig } = createNetworkConfig({
  localnet: { url: getFullnodeUrl("localnet") },
  devnet: { url: getFullnodeUrl("devnet") },
  testnet: { url: getFullnodeUrl("testnet") },
  mainnet: { url: getFullnodeUrl("mainnet") },
});

const configuredNetwork = (import.meta.env.VITE_SUI_NETWORK as string) || "devnet";
const defaultNetwork =
  configuredNetwork in networkConfig ? (configuredNetwork as keyof typeof networkConfig) : "devnet";

const queryClient = new QueryClient();

const slushWalletConfig = {
  name: (import.meta.env.VITE_SLUSH_APP_NAME as string | undefined)?.trim() || "Suirify",
  origin: (import.meta.env.VITE_SLUSH_ORIGIN as string | undefined)?.trim(),
};

// --- Wrap the entire app ---
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
  <SuiClientProvider networks={networkConfig} defaultNetwork={defaultNetwork}>
          <WalletProvider autoConnect slushWallet={slushWalletConfig}>
            <App />
          </WalletProvider>
        </SuiClientProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </React.StrictMode>
);
