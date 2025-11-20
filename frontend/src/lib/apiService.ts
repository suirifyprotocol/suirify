import { createFriendlyError } from "./errorMessages";

const resolveCandidateUrls = () => {
  const candidates = [
    import.meta.env.VITE_API_URL,
    typeof window !== "undefined" ? `${window.location.protocol}//${window.location.hostname}:4000` : null,
    "http://192.168.60.45:4000/",
    "http://localhost:4000/",
    "https://v1.backend.devnet.api.suirify.com/",
    "https://suirify-backend.onrender.com/",
  ];

  const seen = new Set<string>();
  return candidates
    .filter((url): url is string => typeof url === "string" && !!url.trim())
    .map((url) => url.replace(/\/$/, ""))
    .filter((url) => {
      if (seen.has(url)) return false;
      seen.add(url);
      return true;
    });
};

const API_BASES = resolveCandidateUrls();

const defaultHeaders: HeadersInit = {
  "Content-Type": "application/json",
};

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  if (!API_BASES.length) throw new Error("No API endpoints configured.");

  const attemptErrors: string[] = [];
  let lastNetworkError: unknown = null;

  for (const base of API_BASES) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);

    try {
      const response = await fetch(`${base}${path}`, {
        ...options,
        headers: {
          ...defaultHeaders,
          ...(options.headers || {}),
        },
        signal: controller.signal,
      });

      const isJson = response.headers.get("content-type")?.includes("application/json");
      const payload = isJson ? await response.json() : null;

      if (!response.ok) {
        const message = payload?.error || payload?.message || `Request failed with status ${response.status}`;
        const error = new Error(message) as Error & { status?: number };
        error.status = response.status;
        throw error;
      }

      return (payload as T) ?? ({} as T);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        attemptErrors.push(`${base} timed out`);
        lastNetworkError = error;
        continue;
      }
      if (error && typeof error === "object" && "status" in error) {
        throw error as Error;
      }
      const message = error instanceof Error ? error.message : "Unknown network error";
      attemptErrors.push(`${base} failed: ${message}`);
      lastNetworkError = error;
      continue;
    } finally {
      clearTimeout(timeout);
    }
  }

  const aggregated = attemptErrors.join("; ");
  const fallbackMessage =
    aggregated || (lastNetworkError instanceof Error ? lastNetworkError.message : "Unable to reach verification service.");
  const detailedMessage = `Unable to reach verification service. Attempts: ${aggregated || fallbackMessage}`;
  console.error("[api] Verification service unreachable:", detailedMessage);
  throw createFriendlyError(detailedMessage, "We can't reach the verification service right now. Please try again shortly.", detailedMessage);
}

export type CountryOption = {
  name: string;
  label: string;
  iso?: string | null;
  alpha2?: string | null;
};

export async function fetchCountries(): Promise<{ countries: CountryOption[] }> {
  const data = await request<{ success: boolean; countries: CountryOption[] }>("/countries", { method: "GET" });
  return { countries: data.countries || [] };
}

export async function startVerification(payload: { country: string; idNumber: string }) {
  return request<{ success: boolean; sessionId: string }>("/start-verification", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export type FaceVerificationResponse = {
  success: boolean;
  match: boolean;
  similarity: number;
  diffPercent: number;
  bypassed?: boolean;
};

export async function verifyFace(payload: { sessionId: string; livePhoto: string }): Promise<FaceVerificationResponse> {
  return request<FaceVerificationResponse>("/face-verify", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function completeVerification(payload: { sessionId: string; walletAddress: string }) {
  return request<{ success: boolean; consentData: { fullName: string; dateOfBirth: string; photoReference?: string | null } }>(
    "/complete-verification",
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );
}

export type MintConfigResponse = {
  success: boolean;
  packageId: string;
  protocolConfigId: string | null;
  attestationRegistryId: string;
  defaultPolicyId: string | null;
  mintFee: string | null;
  mintFeeMist?: string | null;
  mintFeeSui?: string | null;
  mintFeeSource?: string | null;
  contractVersion: number | null;
  treasuryAddress: string | null;
};

export async function fetchMintConfig() {
  return request<MintConfigResponse>("/mint-config", {
    method: "GET",
  });
}

export type MintRequestLookupResponse = {
  success: boolean;
  hasRequest: boolean;
  requestId?: string | null;
  requestTxDigest?: string | null;
  eventSequence?: string | number | null;
  timestampMs?: string | number | null;
};

export async function lookupMintRequest(walletAddress: string) {
  const encoded = encodeURIComponent(walletAddress);
  return request<MintRequestLookupResponse>(`/mint-request/${encoded}`, {
    method: "GET",
  });
}

export async function finalizeMint(payload: { sessionId: string; requestId: string; requestTxDigest?: string }) {
  return request<{ success: boolean; digest: string }>("/finalize-mint", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function healthCheck() {
  return request<{ ok: boolean; time: number }>("/health", { method: "GET" });
}

export type AttestationSummary = {
  objectId: string;
  jurisdictionCode: string;
  verificationLevel: number;
  issueDate: string;
  expiryDate: string;
  status: string;
};

export async function fetchAttestation(walletAddress: string) {
  return request<{ hasAttestation: boolean; data: AttestationSummary | null }>(`/attestation/${walletAddress}`, {
    method: "GET",
  });
}
