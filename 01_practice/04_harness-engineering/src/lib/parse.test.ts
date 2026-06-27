import { describe, it, expect } from "vitest";
import { extractCveId } from "./parse";

describe("extractCveId", () => {
  it("CVE 번호 단독", () => {
    expect(extractCveId("CVE-2024-3094")).toBe("CVE-2024-3094");
  });

  it("소문자도 인식하고 대문자로 정규화", () => {
    expect(extractCveId("cve-2021-44228 관련 기사")).toBe("CVE-2021-44228");
  });

  it("URL 안에 포함된 경우 추출", () => {
    expect(extractCveId("https://nvd.nist.gov/vuln/detail/CVE-2024-3094")).toBe(
      "CVE-2024-3094",
    );
  });

  it("여러 개면 첫 번째만 반환", () => {
    expect(extractCveId("CVE-2024-3094 그리고 CVE-2021-44228")).toBe(
      "CVE-2024-3094",
    );
  });

  it("마지막 숫자부가 4자리 이상", () => {
    expect(extractCveId("CVE-2024-1234567")).toBe("CVE-2024-1234567");
  });

  it("매칭 없으면 null", () => {
    expect(extractCveId("패치 안내 텍스트, 번호 없음")).toBeNull();
  });

  it("빈 문자열이면 null", () => {
    expect(extractCveId("")).toBeNull();
  });
});
