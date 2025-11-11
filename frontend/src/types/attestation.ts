export type AttestationFields = {
  verification_level?: number | null;
  issue_time_ms?: string | number | null;
  expiry_time_ms?: string | number | null;
  status?: string | null;
  is_human_verified?: boolean | null;
  is_over_18?: boolean | null;
};

export type AttestationContent = {
  fields?: AttestationFields | null;
};

export type AttestationData = {
  objectId?: string;
  content?: AttestationContent | null;
};

export type AttestationLike = {
  data?: AttestationData | null;
  content?: AttestationContent | null;
  objectId?: string;
  error?: unknown;
};
