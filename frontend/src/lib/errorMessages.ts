const defaultFallback = "Something went wrong. Please try again.";

export type FriendlyError = Error & {
  details?: string;
};

type FriendlyRule = {
  test: (raw: string) => boolean;
  message: string;
};

const FRIENDLY_RULES: FriendlyRule[] = [
  {
    test: (raw) => raw.includes("unable to reach verification service"),
    message: "We can't reach the verification service right now. Please try again shortly.",
  },
  {
    test: (raw) => raw.includes("failed to fetch") || raw.includes("network error"),
    message: "We're having trouble connecting to the verification service. Check your network and try again.",
  },
  {
    test: (raw) => raw.includes("timed out"),
    message: "The request took too long. Please try again.",
  },
  {
    test: (raw) => /request failed with status 5\d{2}/i.test(raw),
    message: "The verification service is temporarily unavailable. Please try again shortly.",
  },
  {
    test: (raw) => /request failed with status 4\d{2}/i.test(raw),
    message: "We couldn't process that request. Please double-check your details and try again.",
  },
];

export function toUserFacingMessage(error: unknown, fallback = defaultFallback) {
  const raw =
    typeof error === "string"
      ? error.trim()
      : error instanceof Error
        ? error.message.trim()
        : "";

  if (!raw) {
    return fallback;
  }

  const normalized = raw.toLowerCase();
  const match = FRIENDLY_RULES.find((rule) => rule.test(normalized));
  return match ? match.message : raw;
}

export function createFriendlyError(error: unknown, fallback = defaultFallback, details?: string): FriendlyError {
  const message = toUserFacingMessage(error, fallback);
  const friendlyError = new Error(message) as FriendlyError;
  const derivedDetails =
    details ??
    (typeof error === "string"
      ? error
      : error instanceof Error
        ? error.message
        : undefined);

  if (derivedDetails) {
    friendlyError.details = derivedDetails;
  }

  return friendlyError;
}
