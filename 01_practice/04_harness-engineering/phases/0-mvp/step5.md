# Step 5: analyze-api

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/docs/ARCHITECTURE.md` — "핵심 흐름(route.ts)" 섹션이 이 step의 정답이다
- `/CLAUDE.md` — CRITICAL: API 로직·비밀키는 `src/app/api/` 라우트에서만
- Step 1 산출물: `src/types/index.ts` (`AnalyzeRequest`, `AnalyzeResponse`)
- Step 2 산출물: `src/lib/parse.ts` (`extractCveId`)
- Step 3 산출물: `src/services/nvd.ts` (`fetchCveMetadata`)
- Step 4 산출물: `src/services/openai.ts` (`analyzeCve`)

## 작업

`src/app/api/analyze/route.ts`에 `POST` 핸들러를 만들어 앞 step들의 함수를 조합한다.

```ts
export async function POST(req: Request): Promise<Response>
```

흐름(ARCHITECTURE.md와 동일):
```ts
const { input } = await req.json();              // AnalyzeRequest
const cveId    = extractCveId(input);
const metadata = cveId ? await fetchCveMetadata(cveId) : null;
const analysis = await analyzeCve({ input, metadata });
return Response.json({ cveId, metadata, analysis }); // AnalyzeResponse
```

요구사항:
- 입력 검증: `input`이 비어있거나 문자열이 아니면 400 + `{ error: "..." }`.
- `fetchCveMetadata`는 실패해도 null이므로 그대로 진행(폴백). 별도 try/catch 불필요.
- `analyzeCve` 실패(키 오류/네트워크) → `try/catch`로 잡아 500 + `{ error: "분석 실패" }`(원인 메시지는 서버 로그로만, 키 등 민감정보 노출 금지).
- 성공 응답 타입은 `AnalyzeResponse`와 일치.
- `export const runtime`은 Node 기본(서버 전용 보장). Edge 런타임 사용 금지.

TDD: route의 `POST`를 직접 호출하는 테스트. 내부 `extractCveId`/`fetchCveMetadata`/`analyzeCve`는 mock.
- 정상 입력 + cveId 추출됨 → nvd, openai 호출되고 200 + `AnalyzeResponse`
- cveId 없음 → nvd 미호출, metadata=null로 openai 호출, 200
- 빈 input → 400
- analyzeCve throw → 500 (민감정보 미포함)

## Acceptance Criteria

```bash
npm run build
npm test        # route POST 조합/에러 테스트 통과 (의존 함수 mock)
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 아키텍처 체크리스트:
   - API 로직이 `src/app/api/analyze/route.ts`에만 있는가? (CLAUDE.md CRITICAL)
   - NVD 실패가 전체 실패로 번지지 않는가? (폴백)
   - 에러 응답에 키/스택 등 민감정보가 노출되지 않는가?
   - 응답 형태가 `AnalyzeResponse`와 일치하는가?
3. 결과에 따라 `phases/0-mvp/index.json`의 step 5를 업데이트한다 (completed/error/blocked).

## 금지사항

- 파싱/NVD/OpenAI 로직을 route 안에 재구현하지 마라. 이유: 각 함수를 import해 조합만 한다(중복 금지).
- 에러 응답에 예외 원문·스택·API 키를 담지 마라. 이유: 정보 노출.
- Edge 런타임을 쓰지 마라. 이유: 서버 전용 키/Node API 보장.
- 기존 테스트를 깨뜨리지 마라.
