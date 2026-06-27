import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchCveMetadata } from "./nvd";

// NVD 2.0 응답 샘플 빌더 (필요한 필드만)
function nvdResponse(cve: Record<string, unknown>) {
  return {
    ok: true,
    json: async () => ({ vulnerabilities: [{ cve }] }),
  } as Response;
}

const baseCve = {
  id: "CVE-2024-3094",
  descriptions: [
    { lang: "es", value: "descripción en español" },
    { lang: "en", value: "Malicious code in xz/liblzma backdoor." },
  ],
  references: [
    { url: "https://example.com/a" },
    { url: "https://example.com/b" },
  ],
  configurations: [
    {
      nodes: [
        {
          cpeMatch: [
            { criteria: "cpe:2.3:a:xz:liblzma:5.6.0:*:*:*:*:*:*:*" },
          ],
        },
      ],
    },
  ],
};

describe("fetchCveMetadata", () => {
  beforeEach(() => {
    delete process.env.NVD_API_KEY;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("정상 응답(CVSS v3.1)을 CveMetadata로 매핑한다", async () => {
    const cve = {
      ...baseCve,
      metrics: {
        cvssMetricV31: [{ cvssData: { baseScore: 10.0 } }],
      },
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(nvdResponse(cve)));

    const result = await fetchCveMetadata("CVE-2024-3094");

    expect(result).toEqual({
      id: "CVE-2024-3094",
      cvssScore: 10.0,
      severity: "CRITICAL",
      description: "Malicious code in xz/liblzma backdoor.",
      affectedProducts: ["cpe:2.3:a:xz:liblzma:5.6.0:*:*:*:*:*:*:*"],
      references: ["https://example.com/a", "https://example.com/b"],
    });
  });

  it("CVSS가 v2만 있으면 v2 baseScore/severity로 매핑한다", async () => {
    const cve = {
      ...baseCve,
      metrics: {
        cvssMetricV2: [{ cvssData: { baseScore: 5.0 } }],
      },
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(nvdResponse(cve)));

    const result = await fetchCveMetadata("CVE-2024-3094");

    expect(result?.cvssScore).toBe(5.0);
    expect(result?.severity).toBe("MEDIUM");
  });

  it("CVSS v3.1을 v3.0/v2보다 우선한다", async () => {
    const cve = {
      ...baseCve,
      metrics: {
        cvssMetricV31: [{ cvssData: { baseScore: 9.8 } }],
        cvssMetricV30: [{ cvssData: { baseScore: 7.5 } }],
        cvssMetricV2: [{ cvssData: { baseScore: 4.0 } }],
      },
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(nvdResponse(cve)));

    const result = await fetchCveMetadata("CVE-2024-3094");

    expect(result?.cvssScore).toBe(9.8);
    expect(result?.severity).toBe("CRITICAL");
  });

  it("점수가 없으면 cvssScore=null, severity=UNKNOWN", async () => {
    const cve = { ...baseCve, metrics: {} };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(nvdResponse(cve)));

    const result = await fetchCveMetadata("CVE-2024-3094");

    expect(result?.cvssScore).toBeNull();
    expect(result?.severity).toBe("UNKNOWN");
  });

  it("404 등 ok=false 응답이면 null을 반환한다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 404 } as Response),
    );

    const result = await fetchCveMetadata("CVE-0000-0000");

    expect(result).toBeNull();
  });

  it("네트워크 에러(throw)면 null을 반환한다(폴백)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network down")),
    );

    const result = await fetchCveMetadata("CVE-2024-3094");

    expect(result).toBeNull();
  });

  it("vulnerabilities가 비어 있으면 null을 반환한다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ vulnerabilities: [] }),
      } as Response),
    );

    const result = await fetchCveMetadata("CVE-2024-3094");

    expect(result).toBeNull();
  });

  it("en 설명이 없으면 첫 번째 설명으로 폴백한다", async () => {
    const cve = {
      ...baseCve,
      descriptions: [{ lang: "es", value: "solo español" }],
      metrics: { cvssMetricV31: [{ cvssData: { baseScore: 8.1 } }] },
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(nvdResponse(cve)));

    const result = await fetchCveMetadata("CVE-2024-3094");

    expect(result?.description).toBe("solo español");
  });

  it("NVD_API_KEY가 있으면 apiKey 헤더를 실어 보낸다", async () => {
    process.env.NVD_API_KEY = "secret-key";
    const fetchMock = vi.fn().mockResolvedValue(
      nvdResponse({ ...baseCve, metrics: {} }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await fetchCveMetadata("CVE-2024-3094");

    const init = fetchMock.mock.calls[0][1];
    expect(init.headers).toMatchObject({ apiKey: "secret-key" });
  });

  it("NVD_API_KEY가 없어도 동작한다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      nvdResponse({ ...baseCve, metrics: {} }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchCveMetadata("CVE-2024-3094");

    expect(result).not.toBeNull();
    const init = fetchMock.mock.calls[0][1];
    expect(init?.headers?.apiKey).toBeUndefined();
  });
});
