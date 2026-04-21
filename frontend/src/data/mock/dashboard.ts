import type {
  ComplianceDashboardData,
  RegulatorDashboardData,
} from "@/types/dashboard";

const now = Date.now();

export const mockComplianceDashboardData: ComplianceDashboardData = {
  platformId: "suirify_launchpad_demo",
  kycRate: 0.917,
  activeAttestations: 1824,
  expiredAttestations: 136,
  failedVerifications: 47,
  avgFaceMatchConfidence: 0.89,
  avgLivenessConfidence: 0.96,
  monthlyVolume: [
    { month: "Nov", verifiedCount: 290, failedCount: 7 },
    { month: "Dec", verifiedCount: 335, failedCount: 10 },
    { month: "Jan", verifiedCount: 322, failedCount: 9 },
    { month: "Feb", verifiedCount: 351, failedCount: 8 },
    { month: "Mar", verifiedCount: 344, failedCount: 6 },
    { month: "Apr", verifiedCount: 182, failedCount: 7 },
  ],
  frameworkCoverage: [
    {
      frameworkId: "CBN_KYC_2023",
      requiredClaims: ["nin_verified", "face_matched", "liveness_passed", "is_human_verified"],
      passRate: 0.93,
    },
    {
      frameworkId: "NDPA_2023",
      requiredClaims: ["pii_not_stored", "consent_recorded", "is_human_verified"],
      passRate: 0.98,
    },
    {
      frameworkId: "NITDA_COP_2022",
      requiredClaims: ["nin_verified", "is_human_verified"],
      passRate: 0.95,
    },
    {
      frameworkId: "SEC_2024",
      requiredClaims: ["nin_verified", "face_matched", "liveness_passed", "is_over_18"],
      passRate: 0.91,
    },
  ],
  recentFailures: [
    {
      id: "fail_001",
      timestamp: now - 2 * 60 * 1000,
      platformId: "suirify_launchpad_demo",
      errorCode: "LIVENESS_FAILED",
      faceMatchConfidence: 0.79,
      livenessConfidence: 0.54,
      rulesEngineResult: "FAIL",
    },
    {
      id: "fail_002",
      timestamp: now - 8 * 60 * 1000,
      platformId: "suirify_launchpad_demo",
      errorCode: "FACE_MATCH_FAILED",
      faceMatchConfidence: 0.42,
      livenessConfidence: 0.98,
      rulesEngineResult: "FAIL",
    },
    {
      id: "fail_003",
      timestamp: now - 20 * 60 * 1000,
      platformId: "suirify_launchpad_demo",
      errorCode: "CONSENT_DENIED",
      rulesEngineResult: "FAIL",
    },
  ],
  auditPackReady: true,
  generatedAt: now,
};

export const mockRegulatorDashboardData: RegulatorDashboardData = {
  ecosystem: {
    totalVerifiedUsers: 48291,
    integratedPlatforms: 23,
    complianceRate: 0.917,
    fraudSignals: 47,
  },
  platformCompliance: [
    {
      platformId: "fintech_alpha",
      verificationCount: 12030,
      complianceScore: 0.95,
      activeAttestations: 10984,
      expiredAttestations: 902,
      fraudSignals: 8,
    },
    {
      platformId: "defi_beta",
      verificationCount: 9044,
      complianceScore: 0.9,
      activeAttestations: 7880,
      expiredAttestations: 1044,
      fraudSignals: 16,
    },
    {
      platformId: "wallet_gamma",
      verificationCount: 6188,
      complianceScore: 0.93,
      activeAttestations: 5710,
      expiredAttestations: 390,
      fraudSignals: 5,
    },
  ],
  liveFraudSignals: [
    {
      id: "signal_001",
      timestamp: now - 30 * 1000,
      platformId: "defi_beta",
      signalType: "deepfake_attempt",
      severity: "high",
      confidence: 0.98,
    },
    {
      id: "signal_002",
      timestamp: now - 90 * 1000,
      platformId: "fintech_alpha",
      signalType: "duplicate_nin",
      severity: "medium",
      confidence: 0.88,
    },
    {
      id: "signal_003",
      timestamp: now - 4 * 60 * 1000,
      platformId: "wallet_gamma",
      signalType: "consent_bypass",
      severity: "low",
      confidence: 0.74,
    },
  ],
  expiringAlerts: [
    { platformId: "fintech_alpha", expiringInDays: 7, count: 120 },
    { platformId: "defi_beta", expiringInDays: 14, count: 92 },
    { platformId: "wallet_gamma", expiringInDays: 30, count: 41 },
  ],
  frameworkSummary: {
    CBN_KYC_2023: 0.92,
    NDPA_2023: 0.97,
    NITDA_COP_2022: 0.94,
    SEC_2024: 0.9,
  },
  zeroPiiBadgeText: "Zero PII | NDPA Compliant",
  generatedAt: now,
};
