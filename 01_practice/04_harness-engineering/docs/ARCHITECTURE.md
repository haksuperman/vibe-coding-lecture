# 아키텍처

> MVP 원칙: 추상화 레이어·캐시·DB·상태관리 라이브러리·재시도 로직을 만들지 않는다.
> 파일과 함수는 최소로 유지한다. (상세 유저 플로우: `docs/USER_FLOW.md`)

## 디렉토리 구조 (이게 전부)
```
src/
├── app/
│   ├── api/analyze/route.ts   # POST 하나. 파싱+NVD+OpenAI 조합 (서버 전용)
│   ├── page.tsx               # 메인 페이지 (서버 컴포넌트, 껍데기)
│   ├── layout.tsx             # 다크 테마 + 폰트
│   └── globals.css            # Tailwind
├── components/
│   ├── AnalyzeForm.tsx        # "use client" 입력창+버튼+상태(useState)
│   └── ResultView.tsx         # 결과 4섹션 + CVSS 배지 렌더 (순수 표시)
├── services/
│   ├── nvd.ts                 # fetchCveMetadata() — NVD 호출 1개 함수
│   └── openai.ts              # analyzeCve() — OpenAI 호출 1개 함수
├── lib/
│   └── parse.ts               # extractCveId() — 정규식 추출 1개 함수
└── types/
    └── index.ts               # 타입 전부 여기 (파일 쪼개지 않음)
```

## 타입 (`types/index.ts`)
```ts
type CveMetadata = {
  id: string;                  // "CVE-2024-3094"
  cvssScore: number | null;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';
  description: string;
  affectedProducts: string[];
  references: string[];
};
type AnalysisResult = {
  summary: string;             // 📋 분석/설명
  remediation: string;         // 🛠 조치방안
  relatedCves: string;         // 🔗 유사/관련 취약점
  practiceScenario: string;    // 🧪 실습 시나리오
};
type AnalyzeRequest  = { input: string };
type AnalyzeResponse = {
  cveId: string | null;
  metadata: CveMetadata | null;
  analysis: AnalysisResult;
};
```

## 핵심 흐름 (`app/api/analyze/route.ts` 하나에 다 있음)
```ts
export async function POST(req: Request) {
  const { input } = await req.json();
  const cveId    = extractCveId(input);                    // lib/parse
  const metadata = cveId ? await fetchCveMetadata(cveId) : null; // services/nvd
  const analysis = await analyzeCve({ input, metadata });  // services/openai
  return Response.json({ cveId, metadata, analysis });
}
```

함수 시그니처:
```ts
extractCveId(text: string): string | null
fetchCveMetadata(cveId: string): Promise<CveMetadata | null>   // 실패 시 throw 말고 null
analyzeCve(args: { input: string; metadata: CveMetadata | null }): Promise<AnalysisResult>
```

## 데이터 흐름
```
사용자 입력(CVE번호/URL/뉴스)
  → AnalyzeForm (Client, useState)
  → POST /api/analyze
      → extractCveId : 입력에서 CVE 번호 추출
      → fetchCveMetadata : NVD에서 사실(CVSS·영향제품) 조회 (번호 있을 때만, 실패→null)
      → analyzeCve : NVD 사실 + 입력을 OpenAI에 주입해 4섹션 생성
  → AnalyzeResponse(JSON)
  → ResultView 4섹션 렌더링
```

## 패턴
- Server Components 기본. 입력/상호작용 필요한 `AnalyzeForm`만 `"use client"`.
- 외부 API 호출·비밀키 사용은 **서버 측(`app/api/`, `services/`)에서만**. `NEXT_PUBLIC_`로 키 노출 금지.
- `services/`는 호출+매핑만. 조합(파싱→NVD→OpenAI)은 route.ts에서.

## 상태 관리
- 서버: Route Handler가 매 요청마다 조합해 응답 (Stateless, 저장 없음).
- 클라이언트: `useState` 3개(input, loading, result) + error 문자열 1개. 전역 상태/리액트쿼리/SWR 미사용.

## 에러 처리 (MVP 수준)
- NVD 실패(404/rate limit/타임아웃) → 에러 아님. `metadata=null`로 진행 (입력만으로 분석).
- OpenAI 실패 → 500 + 간단 메시지. 프론트는 에러 상태 표시.
- 재시도·서킷브레이커·에러 클래스 계층은 만들지 않는다.

## 의존성
- 필수: `next`, `react`, `tailwindcss`, `openai`(SDK)
- 개발: `typescript`, `vitest` (+ fetch/SDK mock)
- NVD는 SDK 없이 `fetch` 사용.
