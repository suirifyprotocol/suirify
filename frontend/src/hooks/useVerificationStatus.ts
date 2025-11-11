import { useCurrentAccount, useSuiClient } from "@mysten/dapp-kit";
import type { SuiObjectResponse } from "@mysten/sui/client";
import { STRUCT_ATTESTATION } from "../lib/config";

export type VerificationCheck = {
  hasAttestation: boolean;
  isValid: boolean;
  attestation?: SuiObjectResponse | null;
};

export const useVerificationStatus = () => {
  const account = useCurrentAccount();
  const client = useSuiClient();

  const checkAttestationValidity = (attestation: SuiObjectResponse): boolean => {
    try {
      // Expecting move struct content with fields.status and fields.expiry_time_ms
      const content: any = (attestation as any).data?.content as any;
      const fields = content?.fields ?? {};
      const status = String(fields.status || "ACTIVE");
      const expiry = Number(fields.expiry_time_ms || 0);
      if (status !== "ACTIVE") return false;
      if (expiry && Date.now() > expiry) return false;
      return true;
    } catch {
      return false;
    }
  };

  const checkAttestation = async (walletAddress: string): Promise<VerificationCheck> => {
    try {
      const attestations = await client.getOwnedObjects({
        owner: walletAddress,
        filter: { StructType: STRUCT_ATTESTATION },
        options: { showContent: true },
      });

      if (attestations.data.length > 0) {
        const att = attestations.data[0];
        const isValid = checkAttestationValidity(att);
        return { hasAttestation: true, isValid, attestation: att };
      }

      return { hasAttestation: false, isValid: false, attestation: null };
    } catch (error) {
      // On error, treat as not verified
      return { hasAttestation: false, isValid: false, attestation: null };
    }
  };

  return { account, checkAttestation };
};
