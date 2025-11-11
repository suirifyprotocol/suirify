const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:4000").replace(/\/$/, "");

const defaultHeaders: HeadersInit = {
  "Content-Type": "application/json",
};

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);

  try {
    const response = await fetch(`${API_BASE}${path}`, {
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
      throw new Error("Request timed out. Please try again.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
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

export async function createMintTransaction(payload: { sessionId: string }) {
  return request<{ success: boolean; transaction: string }>("/create-mint-tx", {
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
