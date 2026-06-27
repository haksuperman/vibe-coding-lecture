# Step 4: openai-service

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/docs/ARCHITECTURE.md` — `services/openai.ts` 시그니처
- `/docs/USER_FLOW.md` — 결과 4섹션의 의미와 출처(사실=NVD, 해석=OpenAI)
- `/docs/ADR.md` — ADR-004(키 서버 전용)
- `/CLAUDE.md` — 외부 API/비밀키는 서버 측에서만
- `/.env.example` — `OPENAI_API_KEY`, `OPENAI_MODEL`
- Step 1 산출물: `src/types/index.ts` (`AnalysisResult`, `CveMetadata`)

> 이 프로젝트의 LLM 공급자는 **OpenAI**다. Anthropic/Claude가 아니다.

## 작업

`src/services/openai.ts`에 OpenAI로 4개 섹션을 생성하는 **함수 1개**를 만든다. `openai` SDK 사용.

```ts
export function analyzeCve(args: {
  input: string;
  metadata: CveMetadata | null;
}): Promise<AnalysisResult>
```

요구사항:
- 모델: `process.env.OPENAI_MODEL ?? 'gpt-4o'`.
- API 키: `process.env.OPENAI_API_KEY`. 없으면 명확한 에러를 throw(route.ts가 500으로 변환).
- 프롬프트 구성:
  - `metadata`가 있으면 그 **사실(CVSS, 영향제품, 설명, 참조)을 컨텍스트로 주입**하고 "아래 NVD 사실에 근거해 분석하라"고 지시.
  - `metadata`가 null이면 사용자 `input` 텍스트만으로 분석.
  - 응답은 한국어로, 4개 필드(`summary`, `remediation`, `relatedCves`, `practiceScenario`)를 채우도록 지시.
  - 실습 시나리오는 **안전한 학습용**(격리 환경 전제)으로 작성하도록 지시. 실제 공격 페이로드나 무기화 가능한 익스플로잇 코드는 생성하지 않는다.
- 구조화 출력: JSON 모드(`response_format: { type: 'json_object' }`)로 받아 4개 필드를 파싱해 `AnalysisResult`로 반환. 누락 필드는 빈 문자열로 보정.
- 4개 필드 값은 마크다운 문자열(읽기 좋은 서술/목록)이면 충분하다. 추가 중첩 스키마를 만들지 않는다.

TDD: OpenAI SDK 클라이언트를 mock하여 테스트한다.
- mock이 4필드 JSON을 반환 → `AnalysisResult`로 올바로 파싱
- `metadata` 유무에 따라 프롬프트에 NVD 사실 포함 여부가 달라지는지(전달 인자 검증)
- 일부 필드 누락 JSON → 빈 문자열로 보정
- `OPENAI_API_KEY` 미설정 → throw

## Acceptance Criteria

```bash
npm run build
npm test        # analyzeCve 파싱/프롬프트 테스트 통과 (실제 OpenAI 호출 없이 mock)
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 아키텍처 체크리스트:
   - 반환 타입이 Step 1의 `AnalysisResult`와 정확히 일치하는가?
   - metadata가 있을 때 NVD 사실을 프롬프트에 주입하는가?(ADR-002)
   - 서버 전용이며 키를 클라이언트로 노출하지 않는가?
3. 결과에 따라 `phases/0-mvp/index.json`의 step 4를 업데이트한다 (completed/error/blocked).

## 금지사항

- 테스트에서 실제 OpenAI를 호출하지 마라. 이유: 비용/속도/비결정성. 반드시 mock.
- Anthropic/다른 공급자 SDK를 쓰지 마라. 이유: 이 프로젝트는 OpenAI로 결정됨(ADR-002).
- 무기화 가능한 익스플로잇/실제 공격 페이로드를 생성하도록 프롬프트를 작성하지 마라. 이유: 실습 시나리오는 안전한 학습용으로 한정.
- 4섹션을 과도한 중첩 스키마로 만들지 마라. 이유: MVP는 문자열 4개로 충분.
- 기존 테스트를 깨뜨리지 마라.
