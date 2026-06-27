export type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";

export type CveMetadata = {
  id: string;
  cvssScore: number | null;
  severity: Severity;
  description: string;
  affectedProducts: string[];
  references: string[];
};

export type AnalysisResult = {
  summary: string;
  remediation: string;
  relatedCves: string;
  practiceScenario: string;
};

export type AnalyzeRequest = { input: string };

export type AnalyzeResponse = {
  cveId: string | null;
  metadata: CveMetadata | null;
  analysis: AnalysisResult;
};

// cvssScore(0~10) → Severity. null이면 'UNKNOWN'.
// 기준: 9.0+ CRITICAL, 7.0+ HIGH, 4.0+ MEDIUM, 0.1+ LOW, 그 외/null UNKNOWN.
export function severityFromScore(score: number | null): Severity {
  if (score === null) return "UNKNOWN";
  if (score >= 9.0) return "CRITICAL";
  if (score >= 7.0) return "HIGH";
  if (score >= 4.0) return "MEDIUM";
  if (score >= 0.1) return "LOW";
  return "UNKNOWN";
}
