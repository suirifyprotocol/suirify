export const VERIFICATION_ERROR_CODES = [
  "NIN_NOT_FOUND",
  "FACE_MATCH_FAILED",
  "LIVENESS_FAILED",
  "AGE_BELOW_18",
  "MAX_RETRIES_EXCEEDED",
  "NIN_ALREADY_ATTESTED",
  "CONSENT_DENIED",
] as const;

export type VerificationErrorCode = (typeof VERIFICATION_ERROR_CODES)[number];

export type VerificationStageId =
  | "nin_check"
  | "face_match"
  | "liveness"
  | "pii_purge"
  | "rules_engine";

export type VerificationStageStatus = "pending" | "running" | "pass" | "fail";

export type RulesEngineResult = "PASS" | "FAIL";

export type VerificationClaims = {
  nin_verified: boolean;
  face_matched: boolean;
  liveness_passed: boolean;
  is_over_18: boolean;
  is_human_verified: boolean;
  pii_not_stored: boolean;
  consent_recorded: boolean;
};

export type VerificationStageMetric = {
  model?: string;
  confidence?: number;
  threshold?: number;
};

export type VerificationStage = {
  id: VerificationStageId;
  label: string;
  status: VerificationStageStatus;
  reasonCode?: VerificationErrorCode;
  metric?: VerificationStageMetric;
};

export type VerificationProgressPayload = {
  sessionId: string;
  walletAddress: string;
  startedAt: number;
  updatedAt: number;
  stages: VerificationStage[];
  rulesEngineResult?: RulesEngineResult;
};

export type VerificationResultSuccess = {
  kind: "success";
  attestationId: string;
  frameworkSatisfied: string[];
  claims: VerificationClaims;
  verificationLevel: 1 | 2 | 3;
  issuedAt: number;
  expiresAt: number;
};

export type VerificationResultFailure = {
  kind: "failure";
  errorCode: VerificationErrorCode;
  message: string;
  guidance: string;
  retryable: boolean;
  rulesEngineResult: RulesEngineResult;
};

export type VerificationResult = VerificationResultSuccess | VerificationResultFailure;
