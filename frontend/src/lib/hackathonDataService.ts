import { mockComplianceDashboardData, mockRegulatorDashboardData } from "@/data/mock/dashboard";
import { mockExtensionAnalysisByLanguage } from "@/data/mock/extension";
import type { ComplianceDashboardData, RegulatorDashboardData } from "@/types/dashboard";
import type { ExtensionAnalysis, ExtensionLanguage } from "@/types/extension";

const API_CANDIDATES = [
  import.meta.env.VITE_API_URL,
  "http://localhost:4000",
  "https://suirify-backend-3kgp.onrender.com",
]
  .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
  .map((value) => value.replace(/\/$/, ""));

async function tryRequest<T>(path: string, init?: RequestInit): Promise<T | null> {
  for (const base of API_CANDIDATES) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 7000);

    try {
      const response = await fetch(`${base}${path}`, {
        ...init,
        headers: {
          "Content-Type": "application/json",
          ...(init?.headers || {}),
        },
        signal: controller.signal,
      });

      if (!response.ok) continue;
      return (await response.json()) as T;
    } catch (_err) {
      continue;
    } finally {
      window.clearTimeout(timeout);
    }
  }

  return null;
}

async function tryRequestAny<T>(paths: string[], init?: RequestInit): Promise<T | null> {
  for (const path of paths) {
    const result = await tryRequest<T>(path, init);
    if (result) return result;
  }
  return null;
}

export type VerifyStartPayload = {
  country: string;
  idNumber: string;
};

export type VerifyStartResponse = {
  success: boolean;
  sessionId: string;
};

export type VerifySubmitPayload = {
  sessionId: string;
  walletAddress: string;
};

export type VerifySubmitResponse = {
  success: boolean;
  consentData: {
    fullName: string;
    dateOfBirth: string;
    photoReference?: string | null;
  };
};

function buildFallbackConsent(walletAddress: string): VerifySubmitResponse["consentData"] {
  const suffix = walletAddress ? walletAddress.slice(-4).toUpperCase() : "DEMO";
  return {
    fullName: `Demo User ${suffix}`,
    dateOfBirth: "1994-04-21",
    photoReference: null,
  };
}

export async function startVerificationWithFallback(payload: VerifyStartPayload): Promise<VerifyStartResponse> {
  const response = await tryRequestAny<VerifyStartResponse>(
    ["/api/verify/start", "/start-verification"],
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );

  if (response?.sessionId) {
    return response;
  }

  const fallbackSessionId = `sess_mock_${Date.now().toString(36)}`;
  return {
    success: true,
    sessionId: fallbackSessionId,
  };
}

export async function submitVerificationWithFallback(payload: VerifySubmitPayload): Promise<VerifySubmitResponse> {
  const response = await tryRequestAny<VerifySubmitResponse>(
    ["/api/verify/submit", "/complete-verification"],
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );

  if (response?.consentData?.fullName && response?.consentData?.dateOfBirth) {
    return response;
  }

  return {
    success: true,
    consentData: buildFallbackConsent(payload.walletAddress),
  };
}

export async function getComplianceDashboardData(platformId = "suirify_launchpad_demo"): Promise<ComplianceDashboardData> {
  const response = await tryRequest<ComplianceDashboardData>(`/api/dashboard/compliance?platform_id=${encodeURIComponent(platformId)}`);
  return response || mockComplianceDashboardData;
}

export async function getRegulatorDashboardData(): Promise<RegulatorDashboardData> {
  const response = await tryRequest<RegulatorDashboardData>("/api/dashboard/regulator");
  return response || mockRegulatorDashboardData;
}

export async function analyzePolicyWithFallback(
  payload: { url: string; policyText?: string },
  language: ExtensionLanguage
): Promise<ExtensionAnalysis> {
  const response = await tryRequest<ExtensionAnalysis>("/api/extension/analyze", {
    method: "POST",
    body: JSON.stringify({ ...payload, language }),
  });

  return response || mockExtensionAnalysisByLanguage[language];
}
