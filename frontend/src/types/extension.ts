export type ExtensionLanguage = "EN" | "PIDGIN" | "YORUBA";

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

export type PolicyClauseFlag = {
  id: string;
  clauseTitle: string;
  excerpt: string;
  riskLevel: RiskLevel;
  ndpaReference: string;
  recommendation: string;
};

export type ExtensionAnalysis = {
  url: string;
  riskScore: number;
  summary: string;
  language: ExtensionLanguage;
  flaggedClauses: PolicyClauseFlag[];
  suirifyGap: string;
  poweredBy: "Microsoft Azure";
  analyzedAt: number;
};
