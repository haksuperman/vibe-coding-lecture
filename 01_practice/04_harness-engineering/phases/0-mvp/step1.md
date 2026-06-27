# Step 1: core-types

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/docs/ARCHITECTURE.md` — "타입(`types/index.ts`)" 섹션이 이 step의 정답이다
- `/docs/USER_FLOW.md` — 결과 4섹션의 의미
- `/CLAUDE.md` — 타입은 `src/types/`에 분리
- Step 0 산출물: `src/types/`, `tsconfig.json`, 테스트 설정

이전 step에서 만들어진 구조를 확인한 뒤 작업하라.

## 작업

`src/types/index.ts` **한 파일**에 프로젝트 전체 타입을 정의한다. 파일을 더 쪼개지 않는다.

정의할 타입 (ARCHITECTURE.md와 정확히 일치시킬 것):

```ts
export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';

export type CveMetadata = {
  id: string;
  cvssScore: number | null;
  severity: Severity;
  description: string;
  affectedProducts: string[];
  references: string[];
};

export type AnalysisResult = {
  summary: string;
  remediation: string;
  relatedCves: string;
  practiceScenario: string;
};

export type AnalyzeRequest = { input: string };

export type AnalyzeResponse = {
  cveId: string | null;
  metadata: CveMetadata | null;
  analysis: AnalysisResult;
};
```

추가로, CVSS 점수를 위험도 배지로 변환하는 순수 함수를 **이 step의 타입과 함께** 둔다(타입에 밀접):

```ts
// cvssScore(0~10) → Severity. null이면 'UNKNOWN'.
export function severityFromScore(score: number | null): Severity
```

기준: 9.0+ CRITICAL, 7.0+ HIGH, 4.0+ MEDIUM, 0.1+ LOW, 그 외/null UNKNOWN.

테스트를 먼저 작성한다(TDD): `severityFromScore`의 경계값(0, 3.9, 4.0, 6.9, 7.0, 8.9, 9.0, 10, null)을 검증.

## Acceptance Criteria

```bash
npm run build   # 타입 컴파일 에러 없음
npm test        # severityFromScore 경계값 테스트 통과
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 아키텍처 체크리스트:
   - 타입이 `src/types/index.ts` 한 파일에 모여 있는가? (파일 분할 금지)
   - 타입 이름/필드가 ARCHITECTURE.md와 정확히 일치하는가?
   - TDD 순서(테스트 먼저)를 지켰는가?
3. 결과에 따라 `phases/0-mvp/index.json`의 step 1을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "..."`
   - 실패 → `"status": "error"`, `"error_message": "..."`
   - 개입 필요 → `"status": "blocked"`, `"blocked_reason": "..."`

## 금지사항

- 타입 파일을 여러 개로 쪼개지 마라. 이유: ARCHITECTURE.md가 한 파일로 명시.
- zod 등 런타임 스키마 검증 라이브러리를 도입하지 마라. 이유: MVP 범위 밖(over-engineering).
- 필드명을 임의로 바꾸지 마라(예: `summary`→`analysis`). 이유: 후속 step(openai/ui)이 이 이름에 의존한다.
- 기존 smoke 테스트를 깨뜨리지 마라.
