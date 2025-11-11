import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
	SuiClientProvider,
	WalletProvider,
	createNetworkConfig,
} from "@mysten/dapp-kit";
import { getFullnodeUrl } from "@mysten/sui/client";
import App from "./App.tsx";
import "./index.css";

const queryClient = new QueryClient();

const { networkConfig } = createNetworkConfig({
	mainnet: { url: getFullnodeUrl("mainnet") },
	testnet: { url: getFullnodeUrl("testnet") },
	devnet: { url: getFullnodeUrl("devnet") },
});

createRoot(document.getElementById("root")!).render(
	<QueryClientProvider client={queryClient}>
		<SuiClientProvider networks={networkConfig} defaultNetwork="testnet">
			<WalletProvider>
				<BrowserRouter>
					<App />
				</BrowserRouter>
			</WalletProvider>
		</SuiClientProvider>
	</QueryClientProvider>,
);
