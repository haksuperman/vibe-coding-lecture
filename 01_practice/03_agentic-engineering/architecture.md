# 아키텍처

채팅방 CSV 요약 도우미의 아키텍처 정리 문서입니다. 명령어·개요는 루트 @CLAUDE.md, 서버/API 세부사항은 [`api/CLAUDE.md`](api/CLAUDE.md)를 참고하세요.

## 핵심 설계 결정

**CSV 처리는 전부 브라우저에서 하고, 최종 요약만 서버를 거칩니다.** OpenAI 키는 서버의 `.env`에만 있고 브라우저로는 절대 나가지 않습니다 — 백엔드가 존재하는 유일한 이유가 이것입니다.

## 컴포넌트

- `public/app.js` — 로직의 대부분이 여기 있고 전부 브라우저에서 실행됩니다: 인코딩 감지(UTF-8/EUC-KR, `decodeBuffer`), 따옴표를 처리하는 자체 `parseCSV`, 유연한 컬럼 매핑(`COLUMN_SYNONYMS` + 위치 기반 폴백 `[date, user, message]`), 날짜 파싱, 시스템 메시지 필터링(`SYSTEM_PATTERNS`), 통계 대시보드, 기간 프리셋, 그리고 의도적으로 제한된 마크다운 렌더러(`renderMarkdown`은 `##`, 불릿, `- [ ]` 체크박스, `**굵게**`만 처리). 모든 상태는 모듈 레벨 변수 `records`/`minDate`/`maxDate`/`activePreset`에 보관합니다.
- `public/index.html`, `public/styles.css` — UI 구조와 스타일.
- `api/server.js` — 최소한의 Express 서버: `public/`를 서빙하고 `POST /api/summarize`를 노출합니다. 상세는 [`api/CLAUDE.md`](api/CLAUDE.md) 참고.

## 데이터 흐름

1. 사용자가 CSV를 드롭/로드 → `app.js`가 브라우저에서 디코딩·파싱·필터링하고 통계를 계산합니다.
2. 사용자가 기간을 선택(프리셋 또는 커스텀 범위) → `app.js`가 필터된 메시지를 직렬화합니다.
3. `app.js`가 `{ text, meta }`를 `/api/summarize`로 POST → 서버가 OpenAI로 중계하고 마크다운을 돌려주면 `renderMarkdown`이 화면에 표시합니다.

## 클라이언트↔서버 계약

- 요약 요청 페이로드는 `{ text, meta }`이며, `text`는 메시지를 `[MM-DD HH:mm] 사용자: 내용` 형식으로 직렬화한 것입니다(`app.js`의 `serialize()`).
- 4섹션 출력 형식은 서버의 `SYSTEM_PROMPT`(모델이 생성하는 형식)와 `app.js`의 `renderMarkdown`(클라이언트가 표시할 수 있는 형식)이 서로 일치해야 합니다. 형식 상세는 [`api/CLAUDE.md`](api/CLAUDE.md) 참고.
- `MAX_CHARS`(약 30만 자)는 `app.js`(버튼 비활성화 + 소프트 경고)와 서버(413 하드 거부) 양쪽에 중복되어 있습니다. 항상 일치시키세요.
