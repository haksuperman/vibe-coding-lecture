import { describe, it, expect } from "vitest";
import { severityFromScore } from "./index";

describe("severityFromScore", () => {
  it("null이면 UNKNOWN", () => {
    expect(severityFromScore(null)).toBe("UNKNOWN");
  });

  it("0이면 UNKNOWN (LOW 미만)", () => {
    expect(severityFromScore(0)).toBe("UNKNOWN");
  });

  it("0.1이면 LOW", () => {
    expect(severityFromScore(0.1)).toBe("LOW");
  });

  it("3.9면 LOW", () => {
    expect(severityFromScore(3.9)).toBe("LOW");
  });

  it("4.0이면 MEDIUM", () => {
    expect(severityFromScore(4.0)).toBe("MEDIUM");
  });

  it("6.9면 MEDIUM", () => {
    expect(severityFromScore(6.9)).toBe("MEDIUM");
  });

  it("7.0이면 HIGH", () => {
    expect(severityFromScore(7.0)).toBe("HIGH");
  });

  it("8.9면 HIGH", () => {
    expect(severityFromScore(8.9)).toBe("HIGH");
  });

  it("9.0이면 CRITICAL", () => {
    expect(severityFromScore(9.0)).toBe("CRITICAL");
  });

  it("10이면 CRITICAL", () => {
    expect(severityFromScore(10)).toBe("CRITICAL");
  });
});
