import OpenAI from "openai";
import type { AnalysisResult, CveMetadata } from "../types";

// OpenAI 래퍼. 서버 전용(API 키 사용). NVD 사실 + 입력을 주입해 4섹션을 생성.
// 키 미설정 시 throw(route.ts가 500으로 변환). 응답은 JSON 모드로 받아 4필드 파싱.

const SYSTEM_PROMPT = [
  "당신은 보안 취약점(CVE) 분석 전문가입니다.",
  "주어진 정보를 바탕으로 한국어로 분석 결과를 작성하세요.",
  "반드시 다음 4개 키를 가진 JSON 객체로만 응답하세요:",
  "- summary: 취약점 분석/설명 (무엇이, 어떻게, 왜 위험한지)",
  "- remediation: 조치방안 (패치, 완화책, 우선순위)",
  "- relatedCves: 유사/관련 취약점",
  "- practiceScenario: 실습 시나리오",
  "각 값은 읽기 좋은 마크다운 문자열(서술/목록)로 작성합니다.",
  "실습 시나리오는 격리된 학습 환경을 전제로 한 안전한 학습용으로만 작성하고,",
  "실제 공격 페이로드나 무기화 가능한 익스플로잇 코드는 절대 포함하지 마세요.",
].join("\n");

function buildUserPrompt(args: {
  input: string;
  metadata: CveMetadata | null;
}): string {
  const { input, metadata } = args;
  const parts: string[] = [];

  if (metadata) {
    parts.push(
      "아래 NVD 공식 사실 데이터에 근거해 분석하세요. CVSS 등 사실은 그대로 사용합니다.",
      "## NVD 사실",
      `- CVE 번호: ${metadata.id}`,
      `- CVSS 점수: ${metadata.cvssScore ?? "알 수 없음"}`,
      `- 심각도: ${metadata.severity}`,
      `- 설명: ${metadata.description}`,
      `- 영향 제품: ${
        metadata.affectedProducts.length
          ? metadata.affectedProducts.join(", ")
          : "정보 없음"
      }`,
      `- 참조: ${
        metadata.references.length ? metadata.references.join(", ") : "정보 없음"
      }`,
      "",
    );
  } else {
    parts.push(
      "NVD 공식 데이터가 없습니다. 아래 사용자 입력 텍스트만으로 분석하세요.",
      "",
    );
  }

  parts.push("## 사용자 입력", input);
  return parts.join("\n");
}

export async function analyzeCve(args: {
  input: string;
  metadata: CveMetadata | null;
}): Promise<AnalysisResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY 환경변수가 설정되지 않았습니다.");
  }
  const model = process.env.OPENAI_MODEL ?? "gpt-4o";

  const client = new OpenAI({ apiKey });

  const completion = await client.chat.completions.create({
    model,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildUserPrompt(args) },
    ],
  });

  const content = completion.choices[0]?.message?.content ?? "";
  let parsed: Partial<AnalysisResult> = {};
  try {
    parsed = JSON.parse(content) as Partial<AnalysisResult>;
  } catch {
    parsed = {};
  }

  return {
    summary: parsed.summary ?? "",
    remediation: parsed.remediation ?? "",
    relatedCves: parsed.relatedCves ?? "",
    practiceScenario: parsed.practiceScenario ?? "",
  };
}
