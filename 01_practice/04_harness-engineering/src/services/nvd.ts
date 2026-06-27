import type { CveMetadata } from "../types";
import { severityFromScore } from "../types";

// NVD REST API v2 래퍼. 서버 전용(API 키 사용). SDK 없이 fetch 사용.
// 실패(네트워크/404/rate limit/타임아웃/파싱)시 throw 하지 않고 null 반환(폴백 정책).
const NVD_ENDPOINT = "https://services.nvd.nist.gov/rest/json/cves/2.0";
const TIMEOUT_MS = 8000;

// NVD 응답 중 우리가 읽는 부분만 (느슨하게).
type NvdMetric = { cvssData?: { baseScore?: number } };
type NvdCve = {
  descriptions?: { lang: string; value: string }[];
  references?: { url: string }[];
  metrics?: {
    cvssMetricV31?: NvdMetric[];
    cvssMetricV30?: NvdMetric[];
    cvssMetricV2?: NvdMetric[];
  };
  configurations?: { nodes?: { cpeMatch?: { criteria?: string }[] }[] }[];
};
type NvdResponse = { vulnerabilities?: { cve: NvdCve }[] };

function pickDescription(cve: NvdCve): string {
  const list = cve.descriptions ?? [];
  const en = list.find((d) => d.lang === "en");
  return en?.value ?? list[0]?.value ?? "";
}

function pickCvssScore(cve: NvdCve): number | null {
  const m = cve.metrics;
  const score =
    m?.cvssMetricV31?.[0]?.cvssData?.baseScore ??
    m?.cvssMetricV30?.[0]?.cvssData?.baseScore ??
    m?.cvssMetricV2?.[0]?.cvssData?.baseScore;
  return typeof score === "number" ? score : null;
}

function pickAffectedProducts(cve: NvdCve): string[] {
  const products: string[] = [];
  for (const config of cve.configurations ?? []) {
    for (const node of config.nodes ?? []) {
      for (const match of node.cpeMatch ?? []) {
        if (match.criteria) products.push(match.criteria);
      }
    }
  }
  return products;
}

export async function fetchCveMetadata(
  cveId: string,
): Promise<CveMetadata | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const headers: Record<string, string> = {};
    const apiKey = process.env.NVD_API_KEY;
    if (apiKey) headers.apiKey = apiKey;

    const url = `${NVD_ENDPOINT}?cveId=${encodeURIComponent(cveId)}`;
    const res = await fetch(url, { headers, signal: controller.signal });
    if (!res.ok) return null;

    const data = (await res.json()) as NvdResponse;
    const cve = data.vulnerabilities?.[0]?.cve;
    if (!cve) return null;

    const cvssScore = pickCvssScore(cve);
    return {
      id: cveId,
      cvssScore,
      severity: severityFromScore(cvssScore),
      description: pickDescription(cve),
      affectedProducts: pickAffectedProducts(cve),
      references: (cve.references ?? []).map((r) => r.url),
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
