// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ResultView } from "./ResultView";
import type { AnalyzeResponse, CveMetadata, Severity } from "../types";

afterEach(cleanup);

const analysis = {
  summary: "요약 텍스트",
  remediation: "조치 텍스트",
  relatedCves: "유사 텍스트",
  practiceScenario: "실습 텍스트",
};

function metadataWith(severity: Severity): CveMetadata {
  return {
    id: "CVE-2024-3094",
    cvssScore: 10.0,
    severity,
    description: "",
    affectedProducts: [],
    references: [],
  };
}

describe("ResultView", () => {
  it("metadata=null이면 'NVD 정보 없음' 표기 + 4섹션 모두 렌더", () => {
    const response: AnalyzeResponse = {
      cveId: null,
      metadata: null,
      analysis,
    };
    render(<ResultView response={response} />);

    expect(screen.getByText(/NVD 정보 없음/)).toBeTruthy();
    expect(screen.getByText("요약 텍스트")).toBeTruthy();
    expect(screen.getByText("조치 텍스트")).toBeTruthy();
    expect(screen.getByText("유사 텍스트")).toBeTruthy();
    expect(screen.getByText("실습 텍스트")).toBeTruthy();
  });

  const cases: ReadonlyArray<readonly [Severity, string]> = [
    ["CRITICAL", "🔴"],
    ["HIGH", "🟠"],
    ["MEDIUM", "🟡"],
    ["LOW", "⚪"],
    ["UNKNOWN", "⚪"],
  ];

  it.each(cases)("severity=%s 배지에 이모지·라벨이 표시된다", (severity, emoji) => {
    const response: AnalyzeResponse = {
      cveId: "CVE-2024-3094",
      metadata: metadataWith(severity),
      analysis,
    };
    render(<ResultView response={response} />);

    const badge = screen.getByText(new RegExp(severity));
    expect(badge.textContent).toContain(emoji);
    expect(badge.textContent).toContain(severity);
  });
});
