# 프로젝트: CVE Insight

CVE 번호·URL·뉴스 텍스트를 입력하면 취약점 분석·조치방안·유사 취약점·실습 시나리오를 생성하는 웹 도구. (상세: `docs/PRD.md`)

## 기술 스택
- Next.js 15 (App Router)
- TypeScript (strict mode)
- Tailwind CSS
- OpenAI API (분석 생성)
- NVD REST API v2 (CVE 메타데이터)

## 아키텍처 규칙
- CRITICAL: NVD·OpenAI 등 외부 API 호출과 비밀키 사용은 **반드시 서버 측(`src/app/api/` 라우트 핸들러 또는 `src/services/`)에서만** 처리한다.
- CRITICAL: 클라이언트 컴포넌트에서 OpenAI/NVD를 직접 호출하지 말 것. API 키가 클라이언트 번들에 포함되면 안 된다. (`NEXT_PUBLIC_` 접두사로 비밀키를 노출 금지)
- 컴포넌트는 `src/components/`, 타입은 `src/types/`, 외부 API 래퍼는 `src/services/`, 유틸은 `src/lib/`에 분리한다.

## 개발 프로세스
- CRITICAL: 새 기능 구현 시 반드시 테스트를 먼저 작성하고, 테스트가 통과하는 구현을 작성할 것 (TDD)
- 커밋 메시지는 conventional commits 형식을 따를 것 (feat:, fix:, docs:, refactor:)

## 명령어
npm run dev      # 개발 서버
npm run build    # 프로덕션 빌드
npm run lint     # ESLint
npm run test     # 테스트
