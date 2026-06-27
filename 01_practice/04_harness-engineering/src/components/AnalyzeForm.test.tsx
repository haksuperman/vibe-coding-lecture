// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import AnalyzeForm from "./AnalyzeForm";

afterEach(cleanup);

describe("AnalyzeForm", () => {
  it("빈 input이면 분석하기 버튼이 비활성화되어 제출이 차단된다", () => {
    render(<AnalyzeForm />);
    const button = screen.getByRole("button", {
      name: /분석하기/,
    }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });

  it("input을 채우면 분석하기 버튼이 활성화된다", () => {
    render(<AnalyzeForm />);
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "CVE-2024-3094" },
    });
    const button = screen.getByRole("button", {
      name: /분석하기/,
    }) as HTMLButtonElement;
    expect(button.disabled).toBe(false);
  });

  it("예시 칩 클릭 시 textarea가 채워진다", () => {
    render(<AnalyzeForm />);
    fireEvent.click(screen.getByRole("button", { name: "CVE-2024-3094" }));
    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
    expect(textarea.value).toBe("CVE-2024-3094");
  });
});
