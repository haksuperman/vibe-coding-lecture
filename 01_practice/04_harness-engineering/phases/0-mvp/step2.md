# Step 2: input-parsing

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/docs/ARCHITECTURE.md` — `lib/parse.ts` 시그니처
- `/docs/USER_FLOW.md` — 사용자는 CVE번호/URL/뉴스 텍스트를 자유롭게 붙여넣는다
- Step 1 산출물: `src/types/index.ts`

## 작업

`src/lib/parse.ts`에 입력 텍스트에서 CVE ID를 추출하는 **순수 함수 1개**를 만든다.

```ts
// 임의의 텍스트(번호 단독 / URL / 뉴스 문장)에서 첫 번째 CVE ID를 찾아 정규화해 반환.
// 없으면 null.
export function extractCveId(text: string): string | null
```

요구사항:
- CVE 패턴: `CVE-YYYY-NNNN`이며 마지막 숫자부는 4자리 이상(`CVE-\d{4}-\d{4,}`).
- 대소문자 무관(`cve-2024-3094`도 인식) → 반환은 대문자 정규화(`CVE-2024-3094`).
- URL 안에 포함된 경우도 추출(예: `https://nvd.nist.gov/vuln/detail/CVE-2024-3094`).
- 여러 개면 첫 번째만 반환.
- 매칭 없으면 `null`.

TDD: 아래 케이스를 먼저 테스트로 작성하고 통과시킨다.
- `"CVE-2024-3094"` → `"CVE-2024-3094"`
- `"cve-2021-44228 관련 기사"` → `"CVE-2021-44228"`
- `".../detail/CVE-2024-3094"` → `"CVE-2024-3094"`
- `"패치 안내 텍스트, 번호 없음"` → `null`
- 빈 문자열 → `null`

## Acceptance Criteria

```bash
npm run build
npm test        # extractCveId 케이스 전부 통과
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 아키텍처 체크리스트:
   - `extractCveId`가 `src/lib/parse.ts`에 있고 외부 호출/부수효과가 없는 순수 함수인가?
   - 시그니처가 ARCHITECTURE.md와 일치하는가?
   - TDD 순서를 지켰는가?
3. 결과에 따라 `phases/0-mvp/index.json`의 step 2를 업데이트한다 (completed/error/blocked).

## 금지사항

- 이 함수 안에서 네트워크 호출(NVD 등)을 하지 마라. 이유: 파싱은 순수 함수, 외부 호출은 step3 책임.
- 입력 검증 라이브러리를 도입하지 마라. 이유: 정규식 하나로 충분(MVP).
- 기존 테스트를 깨뜨리지 마라.
