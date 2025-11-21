import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { useCurrentAccount, useSignPersonalMessage } from "@mysten/dapp-kit";
import { useQuery } from "@tanstack/react-query";
import { attachConsentHandler, fetchAttestationStatus, requestClaims } from "@/lib/suirifyApi";
import type { ClaimField } from "@/types";

export type VerificationStatus = "idle" | "loading" | "verified" | "unverified" | "error";

interface VerificationContextValue {
  walletAddress: string | null;
  status: VerificationStatus;
  isVerified: boolean;
  claims: Record<string, unknown> | null;
  refresh: () => Promise<void>;
  requireVerification: () => boolean;
  promptOpen: boolean;
  promptMessage: string;
  openPrompt: (message?: string) => void;
  closePrompt: () => void;
  consentOpen: boolean;
  consentFields: string[];
  consentProcessing: boolean;
  approveConsent: () => void;
  rejectConsent: () => void;
}

const VerificationContext = createContext<VerificationContextValue | undefined>(undefined);

const describeScope = (scope: string) => {
  if (scope === "attestation_lookup") {
    return "allow this app to look up your SUIrify attestation";
  }
  return `share ${scope.replace(/_/g, " ")}`;
};

export const VerificationProvider = ({ children }: { children: ReactNode }) => {
  const account = useCurrentAccount();
  const { mutateAsync: signPersonalMessage } = useSignPersonalMessage();
  const [claims, setClaims] = useState<Record<string, unknown> | null>(null);
  const [promptOpen, setPromptOpen] = useState(false);
  const [promptMessage, setPromptMessage] = useState("You must be verified to continue.");
  const openPrompt = useCallback((message?: string) => {
    if (message) {
      setPromptMessage(message);
    }
    setPromptOpen(true);
  }, []);

  const closePrompt = useCallback(() => setPromptOpen(false), []);
  const [consentOpen, setConsentOpen] = useState(false);
  const [consentFields, setConsentFields] = useState<string[]>([]);
  const [consentProcessing, setConsentProcessing] = useState(false);
  const consentResolver = useRef<((accepted: boolean) => void) | null>(null);
  const autoApproveLookup = useRef(false);
  const lastConsentHash = useRef<string | null>(null);
  const pendingSignatureFields = useRef<string[]>([]);

  const walletAddress = account?.address ?? null;

  useEffect(() => {
    autoApproveLookup.current = false;
    lastConsentHash.current = null;
    pendingSignatureFields.current = [];
  }, [walletAddress]);

  const requestSignature = useCallback(
    async (fields: string[]) => {
      if (!walletAddress) {
        openPrompt("Connect your Sui wallet to approve consent requests.");
        return false;
      }

      const pretty = fields.map((field) => `• ${describeScope(field)}`).join("\n");
      const message = [
        "SUIrify Verified Launchpad is asking for your consent to:",
        pretty,
        "",
        `Wallet: ${walletAddress}`,
        `Timestamp: ${new Date().toISOString()}`
      ].join("\n");

      try {
        const encoded = new TextEncoder().encode(message);
        await signPersonalMessage({ message: encoded });
        return true;
      } catch (error) {
        console.warn("Wallet signature rejected", error);
        return false;
      }
    },
    [walletAddress, signPersonalMessage, openPrompt]
  );

  useEffect(() => {
    attachConsentHandler((fields) => {
      if (autoApproveLookup.current && fields.length === 1 && fields[0] === "attestation_lookup") {
        autoApproveLookup.current = false;
        return Promise.resolve(true);
      }

      const normalized = fields.includes("attestation_lookup") ? fields : ["attestation_lookup", ...fields];
      autoApproveLookup.current = !fields.includes("attestation_lookup");

      const hash = normalized.join("|");
      if (hash === lastConsentHash.current) {
        return Promise.resolve(true);
      }

      pendingSignatureFields.current = normalized;
      setConsentFields(normalized);
      setConsentProcessing(false);
      setConsentOpen(true);
      return new Promise<boolean>((resolve) => {
        consentResolver.current = resolve;
      });
    });
    // attach once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const finalizeConsent = useCallback(
    async (approved: boolean) => {
      const resolver = consentResolver.current;
      const fields = pendingSignatureFields.current;
      if (!resolver) return;

      if (!approved) {
        resolver(false);
        consentResolver.current = null;
        setConsentOpen(false);
        setConsentFields([]);
        setConsentProcessing(false);
        pendingSignatureFields.current = [];
        autoApproveLookup.current = false;
        return;
      }

      setConsentProcessing(true);
      const signed = await requestSignature(fields);
      resolver(signed);
      consentResolver.current = null;
      setConsentOpen(false);
      setConsentFields([]);
      setConsentProcessing(false);
      pendingSignatureFields.current = [];
      if (signed) {
        lastConsentHash.current = fields.join("|");
      }
    },
    [requestSignature]
  );

  const approveConsent = useCallback(() => {
    void finalizeConsent(true);
  }, [finalizeConsent]);

  const rejectConsent = useCallback(() => {
    void finalizeConsent(false);
  }, [finalizeConsent]);

  const {
    data,
    isFetching,
    refetch,
    error
  } = useQuery({
    queryKey: ["attestation", walletAddress],
    queryFn: () => (walletAddress ? fetchAttestationStatus(walletAddress) : Promise.resolve(null)),
    enabled: !!walletAddress,
    refetchOnWindowFocus: false,
    staleTime: 1000 * 30
  });

  const verifyAndReadClaims = useCallback(async () => {
    if (!walletAddress) return;

    const consentedFields: ClaimField[] = [
      "is_human_verified",
      "is_over_18",
      "verification_level",
      "expiry_time_ms"
    ];

    try {
      const unlocked = await requestClaims(walletAddress, consentedFields);
      setClaims(unlocked);
    } catch (error) {
      console.warn("Unable to unlock claims", error);
    }
  }, [walletAddress]);

  const derivedStatus: VerificationStatus = walletAddress
    ? error
      ? "error"
      : isFetching
      ? "loading"
      : data?.status ?? "unverified"
    : "idle";

  useEffect(() => {
    if (derivedStatus === "verified") {
      void verifyAndReadClaims();
    } else {
      setClaims(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [derivedStatus, walletAddress, verifyAndReadClaims]);

  useEffect(() => {
    if (derivedStatus === "verified" && promptOpen) {
      setPromptOpen(false);
    }
  }, [derivedStatus, promptOpen]);

  const requireVerification = useCallback(() => {
    if (!walletAddress) {
      openPrompt("Connect your Sui wallet to continue.");
      return false;
    }
    if (derivedStatus !== "verified") {
      openPrompt("You must be verified with SUIrify to unlock this feature.");
      return false;
    }
    return true;
  }, [walletAddress, derivedStatus, openPrompt]);

  const value = useMemo<VerificationContextValue>(() => {
    return {
      walletAddress,
      status: derivedStatus,
      isVerified: derivedStatus === "verified",
      claims,
      refresh: async () => {
        setClaims(null);
        const next = await refetch();
        if (next.data?.status === "verified") {
          await verifyAndReadClaims();
        }
      },
      requireVerification,
      promptOpen,
      promptMessage,
      openPrompt,
      closePrompt,
      consentOpen,
      consentFields,
      consentProcessing,
      approveConsent,
      rejectConsent
    };
  }, [
    walletAddress,
    derivedStatus,
    claims,
    refetch,
    requireVerification,
    promptOpen,
    promptMessage,
    openPrompt,
    closePrompt,
    verifyAndReadClaims,
    consentOpen,
    consentFields,
    consentProcessing,
    approveConsent,
    rejectConsent
  ]);

  return <VerificationContext.Provider value={value}>{children}</VerificationContext.Provider>;
};

export const useVerification = () => {
  const context = useContext(VerificationContext);
  if (!context) throw new Error("useVerification must be used within VerificationProvider");
  return context;
};
