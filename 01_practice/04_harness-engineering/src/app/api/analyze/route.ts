import type { AnalyzeResponse } from "../../../types";
import { extractCveId } from "../../../lib/parse";
import { fetchCveMetadata } from "../../../services/nvd";
import { analyzeCve } from "../../../services/openai";

// POST /api/analyze — 파싱→NVD→OpenAI 조합 (서버 전용).
// 외부 API 호출·비밀키 사용은 이 라우트/서비스에서만. Node 런타임 기본(Edge 금지).

export async function POST(req: Request): Promise<Response> {
  let input: unknown;
  try {
    const body = (await req.json()) as { input?: unknown };
    input = body.input;
  } catch {
    return Response.json({ error: "잘못된 요청 형식입니다." }, { status: 400 });
  }

  if (typeof input !== "string" || input.trim() === "") {
    return Response.json({ error: "input이 필요합니다." }, { status: 400 });
  }

  // 파싱(순수) + NVD(실패→null 폴백)는 throw 하지 않으므로 try/catch 불필요.
  const cveId = extractCveId(input);
  const metadata = cveId ? await fetchCveMetadata(cveId) : null;

  try {
    const analysis = await analyzeCve({ input, metadata });
    const response: AnalyzeResponse = { cveId, metadata, analysis };
    return Response.json(response);
  } catch (err) {
    // 원인은 서버 로그로만. 키 등 민감정보는 응답에 노출하지 않는다.
    console.error("analyzeCve 실패:", err);
    return Response.json({ error: "분석 실패" }, { status: 500 });
  }
}
