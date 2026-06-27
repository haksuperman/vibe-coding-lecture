"use client";

import { useState } from "react";
import type { AnalyzeResponse } from "../types";
import { ResultView } from "./ResultView";

// 예시 칩: 클릭하면 textarea에 채운다.
const EXAMPLES = ["CVE-2024-3094", "Log4Shell"];

export default function AnalyzeForm() {
  // 클라이언트 상태 4개(useState). 전역 상태/리액트쿼리/SWR 미사용.
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = input.trim() !== "" && !loading;

  async function handleSubmit() {
    if (input.trim() === "") return; // 빈 입력 제출 차단
    setLoading(true);
    setError(null);
    try {
      // 외부 API는 직접 부르지 않고 서버 라우트(/api/analyze)만 호출한다.
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input }),
      });
      if (!res.ok) throw new Error("request failed");
      const data = (await res.json()) as AnalyzeResponse;
      setResult(data);
    } catch {
      setError("분석에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  }

  // 새 분석: 부모(Form)에서 result/error/input 초기화.
  function handleReset() {
    setResult(null);
    setError(null);
    setInput("");
  }

  // ③ 결과 표시 상태
  if (result) {
    return (
      <div className="flex w-full flex-col gap-4">
        <ResultView response={result} />
        <button
          type="button"
          onClick={handleReset}
          className="self-end rounded-md border border-neutral-700 px-4 py-2 text-sm text-neutral-300 transition hover:bg-neutral-800"
        >
          새 분석 ↺
        </button>
      </div>
    );
  }

  // ① 빈 상태 / ② 로딩 / ④ 에러 상태
  return (
    <div className="flex w-full flex-col gap-3">
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        disabled={loading}
        rows={5}
        placeholder="CVE 번호·URL·뉴스 텍스트를 붙여넣으세요 (예: CVE-2024-3094)"
        className="w-full resize-y rounded-lg border border-neutral-800 bg-neutral-900 p-3 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-neutral-600 focus:outline-none disabled:opacity-60"
      />

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-neutral-500">예시:</span>
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            type="button"
            onClick={() => setInput(ex)}
            disabled={loading}
            className="rounded-full border border-neutral-700 px-3 py-1 text-xs text-neutral-300 transition hover:bg-neutral-800 disabled:opacity-60"
          >
            {ex}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!canSubmit}
        className="self-end rounded-md bg-neutral-100 px-5 py-2 text-sm font-medium text-neutral-900 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
      >
        {loading ? "분석 중…" : "분석하기 ▶"}
      </button>

      {/* ② 로딩 중 스켈레톤 */}
      {loading && (
        <div className="flex flex-col gap-3" aria-hidden>
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-lg border border-neutral-800 bg-neutral-900"
            />
          ))}
        </div>
      )}

      {/* ④ 에러 상태 */}
      {error && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-lg border border-red-900 bg-red-950 px-4 py-3 text-sm text-red-300"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={handleSubmit}
            className="shrink-0 rounded-md border border-red-800 px-3 py-1 text-xs text-red-200 transition hover:bg-red-900"
          >
            다시 시도
          </button>
        </div>
      )}
    </div>
  );
}
