import type { ExtensionAnalysis } from "@/types/extension";

const now = Date.now();

export const mockExtensionAnalysisEN: ExtensionAnalysis = {
  url: "https://example.com/privacy",
  riskScore: 71,
  summary:
    "This policy includes broad third-party sharing language and unclear retention timelines for personal data.",
  language: "EN",
  flaggedClauses: [
    {
      id: "clause_001",
      clauseTitle: "Third-Party Data Sharing",
      excerpt:
        "We may share user information with trusted partners for analytics, advertising, and operational services.",
      riskLevel: "HIGH",
      ndpaReference: "NDPA 2023 - Lawful Basis and Data Minimization",
      recommendation: "Limit sharing to explicit consent scopes and list partner categories clearly.",
    },
    {
      id: "clause_002",
      clauseTitle: "Retention Period",
      excerpt: "We retain data as long as needed to provide services and for business purposes.",
      riskLevel: "MEDIUM",
      ndpaReference: "NDPA 2023 - Storage Limitation",
      recommendation: "Add fixed retention windows and deletion timelines for each data category.",
    },
  ],
  suirifyGap:
    "Policy does not clearly state biometric processing controls or explicit NDPA consent proof requirements.",
  poweredBy: "Microsoft Azure",
  analyzedAt: now,
};

export const mockExtensionAnalysisPidgin: ExtensionAnalysis = {
  ...mockExtensionAnalysisEN,
  language: "PIDGIN",
  summary:
    "Dis policy fit share user data with third parties and e no clear talk how long dem go keep your personal data.",
  suirifyGap:
    "Dem never explain well how dem handle biometric data and consent proof under NDPA.",
};

export const mockExtensionAnalysisYoruba: ExtensionAnalysis = {
  ...mockExtensionAnalysisEN,
  language: "YORUBA",
  summary:
    "Ilana yi ni ipin data pelu awon egbe keta, ati pe ko salaye akoko ipamo data ni kedere.",
  suirifyGap:
    "Ko si alaye kedere lori bi won se n tọju data biometrics ati eri iforuko-inu NDPA.",
};

export const mockExtensionAnalysisByLanguage = {
  EN: mockExtensionAnalysisEN,
  PIDGIN: mockExtensionAnalysisPidgin,
  YORUBA: mockExtensionAnalysisYoruba,
} as const;
