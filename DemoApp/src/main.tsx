import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createNetworkConfig,
  SuiClientProvider,
  WalletProvider as SuiWalletProvider
} from "@mysten/dapp-kit";
import { BrowserRouter } from "react-router-dom";
import AppRoutes from "./routes/AppRoutes";
import { VerificationProvider } from "@/context/VerificationContext";
import "@/styles/global.css";
import "@mysten/dapp-kit/dist/index.css";

const queryClient = new QueryClient();
const rpcUrl =
  (typeof window !== "undefined" && (window as any)?.SUI_RPC_URL) ||
  import.meta.env.VITE_SUI_RPC_URL ||
  "https://fullnode.devnet.sui.io:443";

const { networkConfig } = createNetworkConfig({ suirify: { url: rpcUrl } });

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networkConfig} defaultNetwork="suirify">
        <SuiWalletProvider autoConnect>
          <VerificationProvider>
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </VerificationProvider>
        </SuiWalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
