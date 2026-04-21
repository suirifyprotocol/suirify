import type {
  VerificationProgressPayload,
  VerificationResultFailure,
  VerificationResultSuccess,
} from "@/types/verification";

const now = Date.now();

export const mockVerificationProgressSuccess: VerificationProgressPayload = {
  sessionId: "sess_hackathon_success_001",
  walletAddress: "0x7a31d9b6ab31d3bdef9980c0d8b9e998c3c8aa98",
  startedAt: now - 40_000,
  updatedAt: now,
  rulesEngineResult: "PASS",
  stages: [
    {
      id: "nin_check",
      label: "NIN Check",
      status: "pass",
      metric: { model: "NIMC API", confidence: 1, threshold: 1 },
    },
    {
      id: "face_match",
      label: "Face Match",
      status: "pass",
      metric: { model: "Azure Face API", confidence: 0.87, threshold: 0.6 },
    },
    {
      id: "liveness",
      label: "Liveness",
      status: "pass",
      metric: { model: "Azure Face API", confidence: 0.97, threshold: 0.95 },
    },
    { id: "pii_purge", label: "PII Purge", status: "pass" },
    { id: "rules_engine", label: "Rules Engine", status: "pass" },
  ],
};

export const mockVerificationProgressRunning: VerificationProgressPayload = {
  sessionId: "sess_hackathon_running_001",
  walletAddress: "0x7a31d9b6ab31d3bdef9980c0d8b9e998c3c8aa98",
  startedAt: now - 15_000,
  updatedAt: now,
  stages: [
    {
      id: "nin_check",
      label: "NIN Check",
      status: "pass",
      metric: { model: "NIMC API", confidence: 1, threshold: 1 },
    },
    {
      id: "face_match",
      label: "Face Match",
      status: "pass",
      metric: { model: "Azure Face API", confidence: 0.84, threshold: 0.6 },
    },
    {
      id: "liveness",
      label: "Liveness",
      status: "running",
      metric: { model: "Azure Face API", confidence: 0.94, threshold: 0.95 },
    },
    { id: "pii_purge", label: "PII Purge", status: "pending" },
    { id: "rules_engine", label: "Rules Engine", status: "pending" },
  ],
};

export const mockVerificationResultSuccess: VerificationResultSuccess = {
  kind: "success",
  attestationId: "0x2a81ddb9f0bd1574feca199bd2988e9f9d3c123a9001f2bbf247c4f1a3ce9911",
  verificationLevel: 2,
  frameworkSatisfied: ["CBN_KYC_2023", "NDPA_2023", "NITDA_COP_2022", "SEC_2024"],
  issuedAt: now,
  expiresAt: now + 365 * 24 * 60 * 60 * 1000,
  claims: {
    nin_verified: true,
    face_matched: true,
    liveness_passed: true,
    is_over_18: true,
    is_human_verified: true,
    pii_not_stored: true,
    consent_recorded: true,
  },
};

export const mockVerificationFailures: VerificationResultFailure[] = [
  {
    kind: "failure",
    errorCode: "NIN_NOT_FOUND",
    message: "NIN record not found in authoritative registry.",
    guidance: "Verify the 11-digit NIN and try again.",
    retryable: true,
    rulesEngineResult: "FAIL",
  },
  {
    kind: "failure",
    errorCode: "FACE_MATCH_FAILED",
    message: "Selfie did not meet match threshold against NIMC image.",
    guidance: "Retry in brighter light with full face visibility.",
    retryable: true,
    rulesEngineResult: "FAIL",
  },
  {
    kind: "failure",
    errorCode: "LIVENESS_FAILED",
    message: "Liveness confidence fell below required threshold.",
    guidance: "Use a live camera feed and avoid screens or printed photos.",
    retryable: true,
    rulesEngineResult: "FAIL",
  },
  {
    kind: "failure",
    errorCode: "AGE_BELOW_18",
    message: "Age verification failed for this platform policy.",
    guidance: "This flow requires an 18+ attestation claim.",
    retryable: false,
    rulesEngineResult: "FAIL",
  },
  {
    kind: "failure",
    errorCode: "MAX_RETRIES_EXCEEDED",
    message: "Maximum verification attempts reached.",
    guidance: "Wait before retrying or contact Suirify support.",
    retryable: false,
    rulesEngineResult: "FAIL",
  },
  {
    kind: "failure",
    errorCode: "NIN_ALREADY_ATTESTED",
    message: "This NIN is already linked to another wallet.",
    guidance: "Use the original wallet or contact support for recovery.",
    retryable: false,
    rulesEngineResult: "FAIL",
  },
  {
    kind: "failure",
    errorCode: "CONSENT_DENIED",
    message: "Verification cannot proceed without user consent.",
    guidance: "Review requested scopes and approve consent to continue.",
    retryable: true,
    rulesEngineResult: "FAIL",
  },
];
