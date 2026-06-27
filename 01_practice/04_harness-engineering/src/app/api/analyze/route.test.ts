import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AnalysisResult, CveMetadata } from "../../../types";

// 의존 함수(extractCveId/fetchCveMetadata/analyzeCve)는 mock. 실제 호출 없음.
const { extractCveIdMock, fetchCveMetadataMock, analyzeCveMock } = vi.hoisted(
  () => ({
    extractCveIdMock: vi.fn(),
    fetchCveMetadataMock: vi.fn(),
    analyzeCveMock: vi.fn(),
  }),
);
vi.mock("../../../lib/parse", () => ({ extractCveId: extractCveIdMock }));
vi.mock("../../../services/nvd", () => ({
  fetchCveMetadata: fetchCveMetadataMock,
}));
vi.mock("../../../services/openai", () => ({ analyzeCve: analyzeCveMock }));

import { POST } from "./route";

function postRequest(body: unknown): Request {
  return new Request("http://localhost/api/analyze", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const analysis: AnalysisResult = {
  summary: "분석 요약",
  remediation: "조치방안",
  relatedCves: "유사 취약점",
  practiceScenario: "실습 시나리오",
};

const metadata: CveMetadata = {
  id: "CVE-2024-3094",
  cvssScore: 10.0,
  severity: "CRITICAL",
  description: "Malicious code in xz/liblzma backdoor.",
  affectedProducts: ["cpe:2.3:a:xz:liblzma:5.6.0:*:*:*:*:*:*:*"],
  references: ["https://example.com/a"],
};

describe("POST /api/analyze", () => {
  beforeEach(() => {
    extractCveIdMock.mockReset();
    fetchCveMetadataMock.mockReset();
    analyzeCveMock.mockReset();
  });

  it("cveId 추출 시 nvd·openai를 호출하고 200 + AnalyzeResponse를 반환한다", async () => {
    extractCveIdMock.mockReturnValue("CVE-2024-3094");
    fetchCveMetadataMock.mockResolvedValue(metadata);
    analyzeCveMock.mockResolvedValue(analysis);

    const res = await POST(postRequest({ input: "CVE-2024-3094 백도어" }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(fetchCveMetadataMock).toHaveBeenCalledWith("CVE-2024-3094");
    expect(analyzeCveMock).toHaveBeenCalledWith({
      input: "CVE-2024-3094 백도어",
      metadata,
    });
    expect(json).toEqual({
      cveId: "CVE-2024-3094",
      metadata,
      analysis,
    });
  });

  it("cveId가 없으면 nvd를 호출하지 않고 metadata=null로 openai를 호출한다", async () => {
    extractCveIdMock.mockReturnValue(null);
    analyzeCveMock.mockResolvedValue(analysis);

    const res = await POST(postRequest({ input: "그냥 뉴스 텍스트" }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(fetchCveMetadataMock).not.toHaveBeenCalled();
    expect(analyzeCveMock).toHaveBeenCalledWith({
      input: "그냥 뉴스 텍스트",
      metadata: null,
    });
    expect(json).toEqual({ cveId: null, metadata: null, analysis });
  });

  it("input이 비어있으면 400을 반환한다", async () => {
    const res = await POST(postRequest({ input: "" }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBeTruthy();
    expect(extractCveIdMock).not.toHaveBeenCalled();
    expect(analyzeCveMock).not.toHaveBeenCalled();
  });

  it("input이 문자열이 아니면 400을 반환한다", async () => {
    const res = await POST(postRequest({ input: 123 }));

    expect(res.status).toBe(400);
    expect(analyzeCveMock).not.toHaveBeenCalled();
  });

  it("analyzeCve가 throw하면 500 + 민감정보 없는 에러를 반환한다", async () => {
    extractCveIdMock.mockReturnValue(null);
    analyzeCveMock.mockRejectedValue(
      new Error("OPENAI_API_KEY=sk-secret 인증 실패"),
    );

    const res = await POST(postRequest({ input: "뉴스" }));
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toBe("분석 실패");
    expect(JSON.stringify(json)).not.toContain("sk-secret");
  });
});
