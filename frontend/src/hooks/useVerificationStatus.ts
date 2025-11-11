import { useCurrentAccount, useSuiClient } from "@mysten/dapp-kit";
import type { SuiObjectResponse, SuiObjectResponseError } from "@mysten/sui/client";
import { STRUCT_ATTESTATION } from "../lib/config";
import { fetchAttestation } from "../lib/apiService";

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

  const fallbackCheck = async (walletAddress: string): Promise<VerificationCheck> => {
    try {
      const backendResult = await fetchAttestation(walletAddress);
      if (backendResult.hasAttestation && backendResult.data) {
        const status = String(backendResult.data.status || "ACTIVE").toUpperCase();
        const expiry = backendResult.data.expiryDate ? Date.parse(backendResult.data.expiryDate) : null;
        const isValid = status === "ACTIVE" && (!expiry || Date.now() <= expiry);
        return { hasAttestation: true, isValid, attestation: null };
      }
    } catch (error) {
      // ignore backend errors and fall through to default response
    }
    return { hasAttestation: false, isValid: false, attestation: null };
  };

  const extractObjectId = (item: SuiObjectResponse | SuiObjectResponseError | null | undefined): string | null => {
    if (!item || typeof item !== "object") return null;
    if ("data" in item && item.data && "objectId" in item.data) {
      return item.data.objectId as string;
    }
    return null;
  };

  const checkAttestation = async (walletAddress: string): Promise<VerificationCheck> => {
    try {
      const attestations = await client.getOwnedObjects({
        owner: walletAddress,
        filter: { StructType: STRUCT_ATTESTATION },
        options: { showContent: true },
      });

      if (attestations.data.length > 0) {
        const att = attestations.data.find((item) => item && !("error" in item && item.error));
        if (att) {
          const isValid = checkAttestationValidity(att);
          return { hasAttestation: true, isValid, attestation: att };
        }
      }

      return fallbackCheck(walletAddress);
    } catch (error: any) {
      const partialObjectId = extractObjectId(error?.data);
      if (partialObjectId) {
        return { hasAttestation: true, isValid: false, attestation: null };
      }
      return fallbackCheck(walletAddress);
    }
  };

  return { account, checkAttestation };
};
