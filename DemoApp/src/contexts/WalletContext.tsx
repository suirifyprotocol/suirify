import { ReactNode, createContext, useContext } from "react";

interface WalletContextValue {
  connectedWallet: string | null;
}

const WalletContext = createContext<WalletContextValue>({ connectedWallet: null });

export function WalletProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function useWallet() {
  return useContext(WalletContext);
}
