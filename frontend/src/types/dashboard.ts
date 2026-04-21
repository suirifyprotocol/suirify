import type { VerificationErrorCode } from "@/types/verification";

export type FrameworkId =
  | "CBN_KYC_2023"
  | "NDPA_2023"
  | "NITDA_COP_2022"
  | "SEC_2024";

export type MonthlyVolumePoint = {
  month: string;
  verifiedCount: number;
  failedCount: number;
};

export type FrameworkCoverageRow = {
  frameworkId: FrameworkId;
  requiredClaims: string[];
  passRate: number;
};

export type FailureLogRow = {
  id: string;
  timestamp: number;
  platformId: string;
  errorCode: VerificationErrorCode;
  faceMatchConfidence?: number;
  livenessConfidence?: number;
  rulesEngineResult: "PASS" | "FAIL";
};

export type ComplianceDashboardData = {
  platformId: string;
  kycRate: number;
  activeAttestations: number;
  expiredAttestations: number;
  failedVerifications: number;
  avgFaceMatchConfidence: number;
  avgLivenessConfidence: number;
  monthlyVolume: MonthlyVolumePoint[];
  frameworkCoverage: FrameworkCoverageRow[];
  recentFailures: FailureLogRow[];
  auditPackReady: boolean;
  generatedAt: number;
};

export type EcosystemStats = {
  totalVerifiedUsers: number;
  integratedPlatforms: number;
  complianceRate: number;
  fraudSignals: number;
};

export type PlatformComplianceRow = {
  platformId: string;
  verificationCount: number;
  complianceScore: number;
  activeAttestations: number;
  expiredAttestations: number;
  fraudSignals: number;
};

export type FraudSignalItem = {
  id: string;
  timestamp: number;
  platformId: string;
  signalType: "deepfake_attempt" | "duplicate_nin" | "replay_attack" | "consent_bypass";
  severity: "low" | "medium" | "high";
  confidence: number;
};

export type ExpiringAlert = {
  platformId: string;
  expiringInDays: number;
  count: number;
};

export type RegulatorDashboardData = {
  ecosystem: EcosystemStats;
  platformCompliance: PlatformComplianceRow[];
  liveFraudSignals: FraudSignalItem[];
  expiringAlerts: ExpiringAlert[];
  frameworkSummary: Record<FrameworkId, number>;
  zeroPiiBadgeText: string;
  generatedAt: number;
};
