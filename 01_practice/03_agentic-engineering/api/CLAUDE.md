# CLAUDE.md — API / 서버

채팅 요약 앱의 서버 측 API에 대한 가이드입니다. 모든 백엔드 코드는 이 `api/` 디렉터리 아래에 두며, 새로 추가하는 백엔드 모듈도 여기에 넣습니다. 앱 전체 개요는 루트 [`../CLAUDE.md`](../CLAUDE.md)를 참고하세요.

프로젝트 루트에서 `npm start`(`node api/server.js`)로 실행하므로, `__dirname`은 `api/`이지만 `process.cwd()`(따라서 `.env` 로딩)는 프로젝트 루트입니다. 정적 파일은 `../public`에서 서빙합니다.

## 서버가 하는 일

최소한의 Express 서버(`server.js`)입니다: `../public/`를 정적으로 서빙하고, OpenAI chat-completions 호출을 감싸는 핵심 엔드포인트 `POST /api/summarize`와 헬스 체크 `GET /api/health`를 노출합니다. OpenAI 키는 서버의 `.env`에만 있고 클라이언트로는 절대 나가지 않습니다 — 서버가 존재하는 핵심 이유입니다.

## `GET /api/health`

기동·readiness 확인용 경량 엔드포인트입니다. 응답: `{ status: "ok", hasKey, model }` — `hasKey`는 `OPENAI_API_KEY` 설정 여부(키 값은 노출하지 않음), `model`은 현재 모델명. `npm run smoke`(`../scripts/smoke.sh`)가 `sleep` 추측 대신 이 엔드포인트를 폴링해 기동을 확인하고, 이어서 `/`·`/api/summarize` 응답을 검증한 뒤 서버를 자동 종료합니다.

## `POST /api/summarize`

- **요청 본문:** `{ text, meta }` — `text`는 클라이언트에서 `[MM-DD HH:mm] 사용자: 내용` 형식으로 직렬화한 채팅 로그, `meta`는 사용자 메시지 앞에 붙는 한 줄 헤더(기간 / 메시지 수 / 참여자).
- **응답:** 성공 시 `{ summary, model }`.
- **출력 계약:** `SYSTEM_PROMPT`가 정확한 4섹션 한국어 마크다운 형식(전체 요약 / 핵심 주제·논의 / 결정 사항 / 액션 아이템)을 규정합니다. 이 형식은 `../public/app.js`의 `renderMarkdown`과 **반드시 일치해야** 합니다. `renderMarkdown`은 `##`, 불릿, `- [ ]` 체크박스, `**굵게**`만 렌더링합니다. 한쪽 형식만 바꾸면 렌더링이 깨집니다.
- **에러 매핑:** 실패는 상태/코드에 따라 한국어 메시지로 변환됩니다 — 키 없음 → 500, 빈 텍스트 → 400, `MAX_CHARS` 초과 → 413, 잘못된 키 → 401, `insufficient_quota`, 429 레이트 리밋, 5xx. 수정할 때 이 구조화된 매핑을 유지하세요.

## 한도 & 설정

- `MAX_CHARS`(약 30만 자)는 여기서 413 하드 거부이고, `../public/app.js`에도 **중복**되어 있습니다(소프트 경고 + 버튼 비활성화). 양쪽을 항상 일치시키세요.
- `.env` 키(`../.env.example` 참고): `OPENAI_API_KEY`(필수), `OPENAI_MODEL`(기본 `gpt-4o`), `PORT`(기본 3000). 기타 호출 파라미터: `temperature: 0.3`, `max_tokens: 2000`.
