import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { CveMetadata } from "../types";

// openai SDK를 mock. 실제 호출 없이 create 인자/반환을 제어한다.
const { createMock } = vi.hoisted(() => ({ createMock: vi.fn() }));
vi.mock("openai", () => ({
  default: class {
    chat = { completions: { create: createMock } };
  },
}));

import { analyzeCve } from "./openai";

function completion(content: string) {
  return { choices: [{ message: { content } }] };
}

const fullJson = JSON.stringify({
  summary: "분석 요약",
  remediation: "조치방안",
  relatedCves: "유사 취약점",
  practiceScenario: "실습 시나리오",
});

const metadata: CveMetadata = {
  id: "CVE-2024-3094",
  cvssScore: 10.0,
  severity: "CRITICAL",
  description: "Malicious code in xz/liblzma backdoor.",
  affectedProducts: ["cpe:2.3:a:xz:liblzma:5.6.0:*:*:*:*:*:*:*"],
  references: ["https://example.com/a"],
};

describe("analyzeCve", () => {
  beforeEach(() => {
    process.env.OPENAI_API_KEY = "test-key";
    delete process.env.OPENAI_MODEL;
    createMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("4필드 JSON 응답을 AnalysisResult로 파싱한다", async () => {
    createMock.mockResolvedValue(completion(fullJson));

    const result = await analyzeCve({ input: "CVE-2024-3094", metadata: null });

    expect(result).toEqual({
      summary: "분석 요약",
      remediation: "조치방안",
      relatedCves: "유사 취약점",
      practiceScenario: "실습 시나리오",
    });
  });

  it("JSON 모드(json_object)와 기본 모델 gpt-4o로 호출한다", async () => {
    createMock.mockResolvedValue(completion(fullJson));

    await analyzeCve({ input: "CVE-2024-3094", metadata: null });

    const args = createMock.mock.calls[0][0];
    expect(args.model).toBe("gpt-4o");
    expect(args.response_format).toEqual({ type: "json_object" });
  });

  it("OPENAI_MODEL 환경변수를 우선 사용한다", async () => {
    process.env.OPENAI_MODEL = "gpt-4o-mini";
    createMock.mockResolvedValue(completion(fullJson));

    await analyzeCve({ input: "CVE-2024-3094", metadata: null });

    expect(createMock.mock.calls[0][0].model).toBe("gpt-4o-mini");
  });

  it("metadata가 있으면 NVD 사실(CVSS·영향제품·설명)을 프롬프트에 주입한다", async () => {
    createMock.mockResolvedValue(completion(fullJson));

    await analyzeCve({ input: "뉴스 텍스트", metadata });

    const prompt = JSON.stringify(createMock.mock.calls[0][0].messages);
    expect(prompt).toContain("10");
    expect(prompt).toContain("CRITICAL");
    expect(prompt).toContain("Malicious code in xz/liblzma backdoor.");
    expect(prompt).toContain("cpe:2.3:a:xz:liblzma:5.6.0:*:*:*:*:*:*:*");
    expect(prompt).toContain("https://example.com/a");
  });

  it("metadata가 null이면 NVD 사실을 프롬프트에 넣지 않는다", async () => {
    createMock.mockResolvedValue(completion(fullJson));

    await analyzeCve({ input: "그냥 뉴스 텍스트", metadata: null });

    const prompt = JSON.stringify(createMock.mock.calls[0][0].messages);
    expect(prompt).not.toContain("cpe:2.3");
    expect(prompt).toContain("그냥 뉴스 텍스트");
  });

  it("일부 필드 누락 JSON은 빈 문자열로 보정한다", async () => {
    createMock.mockResolvedValue(
      completion(JSON.stringify({ summary: "요약만 있음" })),
    );

    const result = await analyzeCve({ input: "x", metadata: null });

    expect(result).toEqual({
      summary: "요약만 있음",
      remediation: "",
      relatedCves: "",
      practiceScenario: "",
    });
  });

  it("파싱 불가능한 응답은 빈 문자열 4개로 보정한다", async () => {
    createMock.mockResolvedValue(completion("not json"));

    const result = await analyzeCve({ input: "x", metadata: null });

    expect(result).toEqual({
      summary: "",
      remediation: "",
      relatedCves: "",
      practiceScenario: "",
    });
  });

  it("OPENAI_API_KEY 미설정 시 throw 한다", async () => {
    delete process.env.OPENAI_API_KEY;

    await expect(
      analyzeCve({ input: "CVE-2024-3094", metadata: null }),
    ).rejects.toThrow();
    expect(createMock).not.toHaveBeenCalled();
  });
});
