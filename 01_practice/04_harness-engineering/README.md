# CVE Insight

CVE 번호·URL·뉴스 텍스트를 입력하면 취약점을 분석해 **분석/설명 · 조치방안 · 유사 취약점 · 실습 시나리오**를 한 화면에 정리해 주는 웹 도구입니다. 사실 데이터는 NVD(National Vulnerability Database) 공식 API에서 가져오고, 해석·시나리오는 OpenAI가 생성합니다.

> 이 프로젝트는 **하네스 엔지니어링** 실습 예제이기도 합니다. 기획(`docs/`)을 step으로 분할(`phases/`)하고, `scripts/execute.py`가 각 step을 독립 Claude 세션으로 순차 자동 실행합니다. 자세한 워크플로우는 아래 [하네스 워크플로우](#하네스-워크플로우) 참고.

## 주요 기능

- **단순한 입력** — CVE 번호(예: `CVE-2024-3094`), 관련 URL, 뉴스 기사 텍스트 중 무엇이든 붙여넣기
- **NVD 사실 보강** — 입력에서 CVE 번호를 추출해 NVD에서 CVSS 점수·영향 제품·설명·참조 링크를 조회 (실패 시 입력 텍스트만으로 분석하는 폴백)
- **OpenAI 분석 4섹션**
  - 📋 취약점 분석/설명
  - 🛠 조치방안 (패치·완화·우선순위)
  - 🔗 유사/관련 취약점
  - 🧪 실습 시나리오 (안전한 학습용)
- **CVSS 위험도 배지** — 🔴 Critical / 🟠 High / 🟡 Medium / ⚪ Low·Unknown
- **Stateless** — 분석 결과를 저장하지 않고 매 요청마다 새로 생성

## 기술 스택

- Next.js 15 (App Router)
- TypeScript (strict mode)
- Tailwind CSS
- OpenAI API (분석 생성)
- NVD REST API v2 (CVE 메타데이터, `fetch` 사용)
- Vitest (테스트)
- **Node.js 22 LTS** (`.node-version`로 고정)

## 사전 준비

### 1) Node 22

Next.js 15는 Node 22 LTS에서 동작합니다. 이 저장소는 `.node-version`에 `22`를 고정해 두었습니다. [fnm](https://github.com/Schniz/fnm)/nvm 같은 버전 관리자를 쓰면 디렉토리 진입 시 자동 전환됩니다.

```bash
fnm use   # .node-version(22) 자동 적용
node -v   # v22.x 확인
```

> ⚠️ Node 25 등 최신 버전에서는 실험적 `localStorage` 전역이 SSR을 깨뜨려 `/`가 500을 반환합니다. 반드시 Node 22 LTS를 사용하세요.

### 2) 환경변수

`.env.example`을 복사해 `.env.local`을 만들고 키를 채웁니다.

```bash
cp .env.example .env.local
```

| 변수 | 필수 | 설명 |
|------|------|------|
| `OPENAI_API_KEY` | ✅ | OpenAI API 키 (분석 생성) |
| `OPENAI_MODEL` | ⬜ | 사용할 모델 (기본 `gpt-4o`) |
| `NVD_API_KEY` | ⬜ | NVD API 키. 없어도 동작하나 rate limit이 낮아짐 ([발급](https://nvd.nist.gov/developers/request-an-api-key)) |

> `.env.local`은 `.gitignore`되어 커밋되지 않습니다. 비밀키를 절대 커밋하지 마세요.

## 실행

```bash
npm install      # 의존성 설치
npm run dev      # 개발 서버 → http://localhost:3000
npm run build    # 프로덕션 빌드
npm start        # 빌드 결과 실행
npm run lint     # ESLint
npm test         # Vitest (전체 테스트)
```

브라우저에서 `http://localhost:3000`을 열고 CVE 번호/URL/뉴스를 입력한 뒤 **분석하기**를 누르면 결과 4섹션이 표시됩니다.

## 아키텍처

```
src/
├── app/
│   ├── api/analyze/route.ts   # POST /api/analyze — 파싱+NVD+OpenAI 조합 (서버 전용)
│   ├── page.tsx               # 메인 페이지
│   ├── layout.tsx             # 다크 테마 레이아웃
│   └── globals.css            # Tailwind
├── components/
│   ├── AnalyzeForm.tsx        # "use client" 입력 폼 + 상태 관리
│   └── ResultView.tsx         # 결과 4섹션 + CVSS 배지
├── services/
│   ├── nvd.ts                 # fetchCveMetadata() — NVD 조회 (실패 시 null 폴백)
│   └── openai.ts              # analyzeCve() — OpenAI 4섹션 생성
├── lib/
│   └── parse.ts               # extractCveId() — 입력에서 CVE 번호 추출
└── types/
    └── index.ts               # 전체 타입 + severityFromScore()
```

**데이터 흐름**

```
사용자 입력 → AnalyzeForm → POST /api/analyze
   → extractCveId (CVE 번호 추출)
   → fetchCveMetadata (NVD에서 사실 조회, 번호 있을 때만 · 실패 시 null)
   → analyzeCve (NVD 사실 + 입력을 OpenAI에 주입해 4섹션 생성)
   → JSON 응답 → ResultView 렌더링
```

**설계 원칙**

- 외부 API 호출과 비밀키 사용은 **서버 측(`app/api/`, `services/`)에서만** — 클라이언트에 키를 노출하지 않습니다.
- 사실은 NVD에서, 해석·시나리오는 OpenAI에서 — LLM 환각(특히 CVSS 점수)을 NVD 사실로 억제합니다.
- MVP 원칙: 캐시·DB·상태관리 라이브러리·재시도 로직을 두지 않습니다.

자세한 내용은 [`docs/PRD.md`](./docs/PRD.md), [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md), [`docs/ADR.md`](./docs/ADR.md), [`docs/USER_FLOW.md`](./docs/USER_FLOW.md)를 참고하세요.

## 하네스 워크플로우

이 앱은 step 단위 자동 실행 하네스로 구축되었습니다.

```bash
python3 scripts/execute.py 0-mvp          # phases/0-mvp의 step들을 순차 실행
python3 scripts/execute.py 0-mvp --push   # 실행 후 브랜치 push
```

- `phases/0-mvp/step{0..6}.md` — 각 step의 구현 지시서 (독립 세션에서 실행)
- `phases/0-mvp/index.json` — step별 상태/요약 (execute.py가 자동 갱신)
- `execute.py`가 가드레일(CLAUDE.md + docs) 주입, 이전 step 요약 누적, 실패 시 자가 교정(최대 3회), 2단계 커밋(`feat`/`chore`)을 처리합니다.

## 테스트

각 모듈마다 구현과 테스트를 함께 둡니다(`*.test.ts(x)`). Vitest로 실행합니다.

```bash
npm test
```

> 주의: `OPENAI_API_KEY`가 없어도 테스트는 통과합니다 — 외부 API(NVD/OpenAI)는 mock으로 검증합니다.

## 보안 참고

실습 시나리오는 격리 환경을 전제로 한 **안전한 학습용**으로 생성됩니다. 실제 공격 페이로드나 무기화 가능한 익스플로잇 코드는 생성하지 않습니다.
