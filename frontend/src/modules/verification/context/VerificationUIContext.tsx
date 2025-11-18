import React, { createContext, useContext, useMemo, useState } from "react";

export type VerificationUIContextValue = {
  immersive: boolean;
  setImmersive: (value: boolean) => void;
};

const VerificationUIContext = createContext<VerificationUIContextValue | null>(null);

export const VerificationUIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [immersive, setImmersive] = useState(false);

  const value = useMemo(() => ({ immersive, setImmersive }), [immersive]);

  return <VerificationUIContext.Provider value={value}>{children}</VerificationUIContext.Provider>;
};

export const useVerificationUI = () => {
  const ctx = useContext(VerificationUIContext);
  if (!ctx) {
    throw new Error("useVerificationUI must be used within a VerificationUIProvider");
  }
  return ctx;
};
