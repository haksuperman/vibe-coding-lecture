# CLAUDE.md

이 파일은 이 저장소에서 작업하는 Claude Code(claude.ai/code)에게 가이드를 제공합니다.

## 개요

채팅방 CSV 요약 도우미 — 채팅 내보내기 CSV를 받아, 원하는 기간을 고르면 한국어 마크다운 요약(전체 요약 / 핵심 주제 / 결정 사항 / 액션 아이템)을 OpenAI로 만들어 주는 MVP입니다. UI 문구와 코드 주석은 한국어이며, 이 컨벤션을 유지하세요. **문서(`.md`) 파일도 한국어로 작성합니다.**

## 명령어

```bash
cp .env.example .env   # 그다음 OPENAI_API_KEY 채우기
npm install
npm start               # node api/server.js → http://localhost:3000
```

빌드·린트·테스트 설정은 없습니다 — `npm start`가 유일한 스크립트입니다.

## 아키텍처

핵심 설계 결정: **CSV 처리는 전부 브라우저에서 하고, 최종 요약만 서버를 거칩니다.** OpenAI 키는 서버의 `.env`에만 있고 브라우저로는 절대 나가지 않습니다. 컴포넌트 구성, 데이터 흐름, 클라이언트↔서버 계약 등 상세 내용은 @architecture.md 를 참고하세요. 서버/API 세부사항은 [`api/CLAUDE.md`](api/CLAUDE.md)에 있습니다 (`api/` 작업 시 자동 로드되므로 임포트하지 않습니다).

## 설정

통계 대시보드는 API 키 없이도 동작하고, 요약 생성에만 키가 필요합니다. 환경 변수는 [`api/CLAUDE.md`](api/CLAUDE.md)와 `.env.example`에 정리되어 있습니다.
