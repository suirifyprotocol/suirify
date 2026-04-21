import type { VerificationErrorCode } from "@/types/verification";

export const ERROR_CODE_TITLE: Record<VerificationErrorCode, string> = {
  NIN_NOT_FOUND: "NIN not found",
  FACE_MATCH_FAILED: "Face match failed",
  LIVENESS_FAILED: "Liveness check failed",
  AGE_BELOW_18: "Age requirement not met",
  MAX_RETRIES_EXCEEDED: "Maximum retries reached",
  NIN_ALREADY_ATTESTED: "NIN already linked",
  CONSENT_DENIED: "Consent denied",
};

export const ERROR_CODE_GUIDANCE: Record<VerificationErrorCode, string> = {
  NIN_NOT_FOUND: "Confirm the 11-digit NIN and try again.",
  FACE_MATCH_FAILED: "Retry with brighter lighting and full face visibility.",
  LIVENESS_FAILED: "Use a live camera feed; avoid photos and screen replays.",
  AGE_BELOW_18: "This verification flow requires an 18+ claim.",
  MAX_RETRIES_EXCEEDED: "Wait for cooldown or contact Suirify support.",
  NIN_ALREADY_ATTESTED: "Use the original wallet or contact support for recovery.",
  CONSENT_DENIED: "Approve consent request to continue verification.",
};
