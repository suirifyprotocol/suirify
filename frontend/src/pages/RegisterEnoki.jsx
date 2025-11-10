import { useEffect } from "react";
import { useSuiClientContext } from "@mysten/dapp-kit";
import { isEnokiNetwork, registerEnokiWallets } from "@mysten/enoki";

/*
	RegisterEnokiWallets
	Registers Enoki social login wallet providers when the current network is an Enoki-enabled network.
	This component intentionally returns null (it's a side-effect-only component that registers/unregisters providers).
*/
export default function RegisterEnokiWallets() {
	const { client, network } = useSuiClientContext();

	useEffect(() => {
		// Only register Enoki wallets on supported networks
		if (!isEnokiNetwork(network)) return;

		const { unregister } = registerEnokiWallets({
			apiKey: import.meta.env.VITE_ENOKI_API_KEY,
			providers: {
				// Provide the client IDs for each of the auth providers you want to use:
				google: {
					clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID,
				},
				facebook: {
					clientId: "YOUR_FACEBOOK_CLIENT_ID",
				},
				twitch: {
					clientId: "YOUR_TWITCH_CLIENT_ID",
				},
			},
			client,
			network,
		});

		// unregister on unmount
		return unregister;
	}, [client, network]);

	return null;
}