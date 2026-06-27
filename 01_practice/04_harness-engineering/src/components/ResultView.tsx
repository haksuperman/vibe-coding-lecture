import type { AnalyzeResponse, Severity } from "../types";

// 심각도별 배지(이모지·라벨·포인트 컬러). 무채색 기반 + 위험도에만 색.
const SEVERITY_BADGE: Record<
  Severity,
  { emoji: string; className: string }
> = {
  CRITICAL: { emoji: "🔴", className: "bg-red-950 text-red-300 ring-red-800" },
  HIGH: { emoji: "🟠", className: "bg-orange-950 text-orange-300 ring-orange-800" },
  MEDIUM: { emoji: "🟡", className: "bg-yellow-950 text-yellow-200 ring-yellow-800" },
  LOW: { emoji: "⚪", className: "bg-neutral-800 text-neutral-300 ring-neutral-700" },
  UNKNOWN: { emoji: "⚪", className: "bg-neutral-800 text-neutral-300 ring-neutral-700" },
};

// 결과 4섹션. AnalysisResult 키와 1:1.
const SECTIONS = [
  { key: "summary", emoji: "📋", title: "취약점 분석/설명" },
  { key: "remediation", emoji: "🛠", title: "조치방안" },
  { key: "relatedCves", emoji: "🔗", title: "유사/관련 취약점" },
  { key: "practiceScenario", emoji: "🧪", title: "실습 시나리오 (학습용)" },
] as const;

export function ResultView({ response }: { response: AnalyzeResponse }) {
  const { cveId, metadata, analysis } = response;
  const badge = metadata ? SEVERITY_BADGE[metadata.severity] : null;

  return (
    <div className="flex w-full flex-col gap-4">
      {/* 상단 고정 헤더: CVE 번호 + CVSS 배지(또는 NVD 정보 없음) */}
      <header className="flex flex-wrap items-center gap-3 border-b border-neutral-800 pb-4">
        <span className="font-mono text-lg font-semibold text-neutral-100">
          {cveId ?? "분석 결과"}
        </span>
        {metadata && badge ? (
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ring-1 ${badge.className}`}
          >
            {badge.emoji} {metadata.severity}
            {metadata.cvssScore !== null && (
              <span className="opacity-80">· CVSS {metadata.cvssScore.toFixed(1)}</span>
            )}
          </span>
        ) : (
          <span className="rounded-full bg-neutral-800 px-3 py-1 text-sm text-neutral-400 ring-1 ring-neutral-700">
            NVD 정보 없음 (입력 기반 분석)
          </span>
        )}
      </header>

      {/* 4섹션 카드 */}
      {SECTIONS.map((section) => (
        <section
          key={section.key}
          className="rounded-lg border border-neutral-800 bg-neutral-900 p-4"
        >
          <h2 className="mb-2 text-base font-semibold text-neutral-200">
            {section.emoji} {section.title}
          </h2>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-300">
            {analysis[section.key]}
          </p>
        </section>
      ))}
    </div>
  );
}
