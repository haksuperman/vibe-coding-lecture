# Step 3: nvd-service

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/docs/ARCHITECTURE.md` — `services/nvd.ts` 시그니처 + 에러 처리 정책
- `/docs/ADR.md` — ADR-002(NVD 사실 + 폴백), ADR-004(키 서버 전용)
- `/CLAUDE.md` — 외부 API 호출은 서버 측에서만
- Step 1 산출물: `src/types/index.ts` (`CveMetadata`, `severityFromScore`)

## 작업

`src/services/nvd.ts`에 NVD REST API v2 래퍼 **함수 1개**를 만든다. SDK 없이 `fetch` 사용.

```ts
// NVD에서 CVE 메타데이터 조회. 실패(네트워크/404/rate limit/타임아웃/파싱)시 throw 하지 말고 null 반환.
export function fetchCveMetadata(cveId: string): Promise<CveMetadata | null>
```

요구사항:
- 엔드포인트: `https://services.nvd.nist.gov/rest/json/cves/2.0?cveId={cveId}`.
- `process.env.NVD_API_KEY`가 있으면 요청 헤더 `apiKey`에 실어 보낸다. 없어도 동작해야 한다.
- 응답 매핑 → `CveMetadata`:
  - `id`: 요청한 cveId
  - `description`: `descriptions[]` 중 `lang === 'en'` 우선
  - `cvssScore`: CVSS v3.1 → v3.0 → v2 순으로 존재하는 baseScore. 없으면 null.
  - `severity`: Step 1의 `severityFromScore(cvssScore)` 사용(NVD의 문자열 severity 대신 점수 기반으로 통일).
  - `affectedProducts`: configurations에서 추출 가능한 제품명(또는 CPE) 일부. 파싱이 까다로우면 빈 배열 허용.
  - `references`: `references[].url` 목록.
- 모든 외부 호출은 `try/catch`로 감싸 실패 시 `null` 반환. **throw 금지**(폴백 정책).
- 네트워크 타임아웃을 `AbortController`로 적용(예: 8초).

TDD: `fetch`를 mock하여 아래를 테스트한다.
- 정상 응답(샘플 NVD JSON) → 필드가 올바로 매핑된 `CveMetadata`
- CVSS가 v2만 있는 응답 → 점수/severity 매핑
- 404/네트워크 에러 → `null`
- 점수 없는 응답 → `cvssScore=null`, `severity='UNKNOWN'`

## Acceptance Criteria

```bash
npm run build
npm test        # nvd 매핑/폴백 테스트 통과 (실제 네트워크 호출 없이 mock)
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 아키텍처 체크리스트:
   - 실패 시 throw 하지 않고 null을 반환하는가? (ADR-002 폴백)
   - `NVD_API_KEY` 없이도 동작하는가?
   - `severityFromScore`를 재사용했는가? (중복 정의 금지)
   - 이 파일이 클라이언트에서 import되지 않는 서버 전용인가?
3. 결과에 따라 `phases/0-mvp/index.json`의 step 3을 업데이트한다 (completed/error/blocked).

## 금지사항

- 테스트에서 실제 NVD에 네트워크 호출을 하지 마라. 이유: 느리고 rate limit/불안정. 반드시 mock.
- 실패를 throw로 전파하지 마라. 이유: route.ts는 NVD 실패 시 입력만으로 분석을 이어가야 한다(폴백).
- 재시도/캐싱 로직을 넣지 마라. 이유: MVP 범위 밖.
- 기존 테스트를 깨뜨리지 마라.
