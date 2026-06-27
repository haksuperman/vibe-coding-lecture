# Step 0: project-setup

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/docs/PRD.md` — 무엇을 만드는지
- `/docs/ARCHITECTURE.md` — 디렉토리 구조와 lean 원칙
- `/docs/ADR.md` — 기술 결정(특히 ADR-004 비밀키 관리)
- `/CLAUDE.md` — 기술 스택과 CRITICAL 규칙
- `/.env.example`, `/.gitignore` — 이미 생성된 환경변수 설정

## 작업

Next.js 15 프로젝트 골격을 만든다. **빈 폴더만 만들지 말고**, 실제로 빌드·테스트가 통과하는 최소 골격을 세운다.

1. **Next.js 15 + TypeScript(strict) + Tailwind CSS** 초기화.
   - App Router 사용. `src/` 디렉토리 사용.
   - `tsconfig.json`은 `"strict": true`.
   - 기존 루트 파일(`.env.local`, `.env.example`, `.gitignore`, `CLAUDE.md`, `docs/`, `phases/`, `scripts/`)을 덮어쓰거나 지우지 말 것.
2. **디렉토리 구조 생성** (ARCHITECTURE.md 그대로):
   `src/app/`, `src/components/`, `src/services/`, `src/lib/`, `src/types/`.
   - 이 step에서는 각 폴더에 빈 placeholder를 두지 않는다. 실제 코드는 다음 step들에서 채운다.
   - 단, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`는 Next.js 구동에 필요하므로 기본형으로 생성한다. `layout.tsx`는 다크 테마(`<html className="dark">` 또는 body 배경 무채색 다크)를 적용한다.
3. **Vitest 설정** (TDD 강제용):
   - `vitest` 설치, `vitest.config.ts` 생성. 테스트 환경은 `node` 기본(필요 시 jsdom은 UI step에서 추가).
   - `package.json` scripts에 `"test": "vitest run"` 추가.
   - smoke 테스트 1개(`src/lib/__tests__` 또는 `tests/smoke.test.ts`)를 만들어 `npm test`가 초록으로 통과함을 보장한다.
4. **OpenAI SDK 설치**: `openai` 패키지를 dependencies에 추가(설치만, 사용은 step4). NVD용 별도 SDK는 설치하지 않는다.
5. **package.json scripts** 최종 확인: `dev`, `build`, `lint`, `test` 4개가 모두 동작해야 한다.

환경변수는 이미 `/.env.local`, `/.env.example`에 정의돼 있다. 새로 만들지 말고 그대로 사용한다.

## Acceptance Criteria

```bash
npm install
npm run build   # 컴파일/빌드 에러 없음
npm run lint    # 린트 통과
npm test        # smoke 테스트 통과
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 아키텍처 체크리스트를 확인한다:
   - ARCHITECTURE.md 디렉토리 구조(`src/app|components|services|lib|types`)를 따르는가?
   - ADR 기술 스택(Next.js 15 / TS strict / Tailwind)을 벗어나지 않았는가?
   - CLAUDE.md CRITICAL 규칙(비밀키 서버 전용, `NEXT_PUBLIC_` 미사용)을 위반하지 않았는가?
3. 결과에 따라 `phases/0-mvp/index.json`의 step 0을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "산출물 한 줄 요약 (생성된 주요 파일 포함)"`
   - 수정 3회 후에도 실패 → `"status": "error"`, `"error_message": "구체적 에러"`
   - 사용자 개입 필요 → `"status": "blocked"`, `"blocked_reason": "사유"` 후 중단

## 금지사항

- 기존 루트 파일(`.env.local`, `.env.example`, `.gitignore`, `CLAUDE.md`, `docs/`, `phases/`, `scripts/`)을 덮어쓰거나 삭제하지 마라. 이유: 이미 작성된 설정·계획이 사라진다.
- `.env.local`에 실제 키를 넣지 마라. 이유: 비밀키는 사용자가 직접 채운다.
- 상태관리 라이브러리(redux/zustand)·리액트쿼리·zod 등 MVP에 불필요한 의존성을 설치하지 마라. 이유: over-engineering 금지(ARCHITECTURE.md).
- 빈 placeholder 파일로 폴더만 채우지 마라. 이유: 실제 코드는 후속 step에서 만든다.
