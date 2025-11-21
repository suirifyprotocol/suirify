export interface AttestationSummary {
  status: "verified" | "unverified";
  expiresAt?: string;
  level?: number;
  objectId?: string;
}

export type ClaimField =
  | "is_human_verified"
  | "is_over_18"
  | "verification_level"
  | "expiry_time_ms";

export interface LaunchpadProject {
  id: string;
  name: string;
  teaser: string;
  category: string;
  logo: string;
  tags: string[];
  publicInfo: {
    summary: string;
    targetRaise: string;
    chain: string;
  };
  gatedInfo: {
    tokenomics: string;
    alphaInsight: string;
    investors: string[];
    roadmap: { title: string; detail: string }[];
  };
}

export interface ProjectComment {
  id: string;
  author: string;
  body: string;
  timestamp: string;
}
