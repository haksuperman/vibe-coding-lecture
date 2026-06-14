# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

점심 메뉴 랜덤 추천기 MVP. 빌드 단계나 프레임워크 없이 **단일 `index.html`** (인라인 `<style>` + `<script>`, 외부 의존성 0)로 동작한다. 브라우저에서 파일을 직접 열어 실행한다(`open index.html`).

`package.json`의 npm 스크립트는 앱을 번들링하기 위한 것이 아니라, `index.html`을 **정적으로 검증**하기 위한 node 내장 전용 도구다(런타임 의존성 없음).

## Commands

```bash
npm run lint    # index.html의 <script> 블록 JS 문법 검사 (vm.Script 파싱)
npm run build   # 필수 DOM id 존재 검증 후 dist/index.html 산출
npm test        # 보안/영속성/회귀 스모크 검사 (정적, 브라우저 불필요)
npm run precommit  # lint && build && test 순차 실행
open index.html    # 앱 실행
```

- 단일 검사만 빠르게 돌리려면 스크립트를 직접 실행한다: `node scripts/test.mjs`.
- `scripts/test.mjs`는 테스트 러너가 아니라 `check(name, cond)` 어서션 목록이다. 테스트 추가 = 그 파일에 `check(...)` 한 줄 추가.

## Architecture

### 앱 (`index.html`)
모든 로직이 하단 `<script>` 하나에 모여 있고, 모듈 스코프 변수로 상태를 관리한다(프레임워크/리액티브 시스템 없음). 상태를 바꾸는 모든 경로는 **수동으로** 해당 `render*()` 함수와 `saveState()`를 호출해야 한다 — 자동 리렌더가 없으므로 이 두 호출을 빠뜨리면 UI나 영속성이 어긋난다.

핵심 상태: `selectedCategories`(다중 선택, 빈 배열 = 전체), `lastPicked`(최근 제외용), `history`(최대 10), `menus`(사용자 편집 가능), `isSpinning`(애니메이션 중 재진입 가드).

데이터 흐름의 큰 그림:
- **추천**: `spin()` → `getPool()`(카테고리 필터 + 최근 메뉴 제외, 풀이 비면 제외 해제 가드) → `setTimeout` 감속 루프로 슬롯머신 연출 → 정지 시 `lastPicked` 갱신 + `addHistory()`.
- **영속성**: 모든 상태가 `localStorage`의 단일 키 `STORAGE_KEY`(`lunchPicker.v1`)에 JSON으로 저장된다. `loadState()`는 `try/catch` + 타입 검증으로 깨진 데이터에 폴백하고, 구버전 단일 `selectedCategory` → 배열 `selectedCategories` 마이그레이션을 처리한다.
- **카테고리 색상**: `CATEGORY_COLOR` 맵 한 곳이 필터 칩·기록 배지·슬롯·메뉴 관리 헤더 색을 모두 결정한다. 색을 바꾸려면 이 맵만 수정한다.

### 불변 규칙 (검사로 강제됨)
- **사용자 입력은 절대 `innerHTML`로 렌더하지 않는다** — 메뉴 이름 등은 `textContent`/`createElement`로만 그린다(XSS 방지). `scripts/test.mjs`가 회귀를 검사한다.
- DOM id를 추가/변경/삭제하면 `scripts/build.mjs`의 `requiredIds` 목록과 동기화해야 한다.

## Claude Code config (`.claude/`)

이 저장소는 Claude Code 기능 자체를 실습하는 예제이기도 하다:
- `skills/mvp-code-review/SKILL.md` — 코드 리뷰 체크리스트 스킬(내장 `/code-review`와 충돌 피하려 별도 명명).
- `agents/code-reviewer.md` — 위 스킬을 호출해 리뷰하는 읽기 전용 서브에이전트.
- `settings.json` + `hooks/pre-commit-check.mjs` — `PreToolUse`(Bash) 훅. 명령이 `git commit`일 때만 lint/build/test를 돌리고 실패 시 **exit 2로 커밋을 차단**한다. 훅 변경은 세션 재시작 후 적용된다.

> 참고: 아직 git 저장소가 아니다(`git init` 필요). 훅은 init 이후 `git commit` 시도에 작동한다.
