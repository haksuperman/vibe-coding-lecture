# Step 6: ui

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/docs/USER_FLOW.md` — 화면 4상태(빈/로딩/결과/에러), 와이어프레임, 결과 4섹션, CVSS 배지
- `/docs/PRD.md` — 디자인(다크 미니멀, 무채색 + 위험도 포인트 컬러)
- `/docs/ARCHITECTURE.md` — 클라이언트 상태(useState 3개 + error), 컴포넌트 분리
- `/CLAUDE.md` — 컴포넌트는 `src/components/`, 클라이언트에서 OpenAI/NVD 직접 호출 금지
- Step 1 산출물: `src/types/index.ts` (`AnalyzeResponse`, `severityFromScore`)
- Step 5 산출물: `src/app/api/analyze/route.ts` (`POST /api/analyze`)

## 작업

입력 폼과 결과 표시 UI를 만들어 `/api/analyze`와 연결한다.

1. **`src/components/AnalyzeForm.tsx`** (`"use client"`)
   - 상태: `useState`로 `input`, `loading`, `result`, `error` 4개.
   - 큰 textarea(CVE번호/URL/뉴스 붙여넣기) + "분석하기" 버튼.
   - 예시 칩(예: `CVE-2024-3094`, `Log4Shell`) 클릭 시 textarea 채움.
   - 제출 시 `fetch('/api/analyze', { method:'POST', body: JSON.stringify({ input }) })`.
   - 4상태 처리: 빈/로딩(버튼 비활성+스피너 또는 스켈레톤)/결과(`<ResultView>`)/에러(메시지+다시 시도).
   - input이 비면 제출 막기.

2. **`src/components/ResultView.tsx`** (순수 표시, props: `AnalyzeResponse`)
   - 상단 고정 헤더: `cveId` + CVSS 배지. `metadata.severity`로 색/이모지 결정(🔴CRITICAL/🟠HIGH/🟡MEDIUM/⚪LOW·UNKNOWN). `metadata`가 null이면 배지 대신 "NVD 정보 없음(입력 기반 분석)" 표기.
   - 4섹션 카드/아코디언: 📋`summary` / 🛠`remediation` / 🔗`relatedCves` / 🧪`practiceScenario`.
   - 각 섹션 문자열은 마크다운으로 렌더(간단한 렌더러 또는 `whitespace-pre-wrap`로 충분. 무거운 마크다운 라이브러리는 선택).
   - "새 분석" 동작은 부모(Form)에서 result를 초기화하는 방식으로 연결.

3. **`src/app/page.tsx`** — `<AnalyzeForm />`을 배치하는 서버 컴포넌트 껍데기 + 제목.

4. **스타일**: Tailwind로 다크 미니멀(무채색 배경/카드, 위험도에만 포인트 컬러). 반응형 1컬럼.

UI 컴포넌트 테스트(jsdom 필요 시 vitest 환경 추가):
- `ResultView`에 metadata=null 응답 → "NVD 정보 없음" 표기, 4섹션 렌더
- `ResultView`에 severity별 → 올바른 배지 텍스트/이모지
- `AnalyzeForm`: 빈 input 제출 차단(또는 버튼 disabled)

## Acceptance Criteria

```bash
npm run build   # 빌드 에러 없음 (RSC/Client 경계 포함)
npm run lint
npm test        # UI 컴포넌트 테스트 통과
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 아키텍처 체크리스트:
   - 클라이언트 컴포넌트가 OpenAI/NVD를 직접 호출하지 않고 `/api/analyze`만 부르는가? (CLAUDE.md CRITICAL)
   - 컴포넌트가 `src/components/`에 있고, `AnalyzeForm`만 `"use client"`인가?
   - `severityFromScore`/배지 매핑이 Step 1 타입과 일치하는가?
   - USER_FLOW.md의 4상태가 모두 구현됐는가?
3. (수동 권장) `npm run dev` 후 실제 CVE 번호로 분석이 동작하는지 확인. 단, 이는 `OPENAI_API_KEY`가 `.env.local`에 채워져 있어야 한다. 키가 없으면 AC(빌드/테스트)까지만 충족하고 런타임 확인은 사용자에게 안내한다.
4. 결과에 따라 `phases/0-mvp/index.json`의 step 6을 업데이트한다 (completed/error/blocked).

## 금지사항

- 클라이언트에서 OpenAI/NVD/`process.env`의 비밀키에 접근하지 마라. 이유: 키 노출(CLAUDE.md CRITICAL).
- 전역 상태 라이브러리·리액트쿼리·SWR를 도입하지 마라. 이유: useState로 충분(MVP).
- 테마 토글/다국어/추가 페이지를 만들지 마라. 이유: MVP 범위 밖. 다크 단일 페이지로 고정.
- 기존 테스트(types/lib/services/api)를 깨뜨리지 마라.
