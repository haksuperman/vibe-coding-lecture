# CLAUDE.md

## 하네스: 웹툰 제작

**목표:** 기획(세계관·캐릭터)부터 시나리오·콘티·작화 프롬프트·일관성 검수까지 웹툰 한 화 제작 파이프라인을 에이전트 팀으로 자동화한다.

**트리거:** 웹툰 제작 관련 요청(화 만들기, 세계관·캐릭터 기획, 시나리오·콘티·작화 프롬프트 생성, 부분 수정/재실행) 시 `webtoon-orchestrator` 스킬을 사용하라. 단순 질문은 직접 응답 가능.

**작화 타깃:** OpenAI GPT Image 2 (자연어 서술형 프롬프트 + 레퍼런스 이미지 일관성).

**변경 이력:**

| 날짜 | 변경 내용 | 대상 | 사유 |
|------|----------|------|------|
| 2026-06-29 | 초기 구성 (5인 팀 + 오케스트레이터) | 전체 | - |
| 2026-06-29 | 작화 타깃 GPT Image 2로 확정 | skills/art-prompt-design | 사용자 지정 |
| 2026-06-29 | 제작 기획안 승인 게이트(Phase 1.5) 추가 | webtoon-orchestrator, story-architecture, agents/story-architect | "기획안 먼저 승인받자" 피드백 |
| 2026-06-29 | 실제 이미지 생성 단계(선택) 추가 — OpenAI gpt-image-1 연동 | agents/webtoon-illustrator, skills/webtoon-illustration(+scripts), webtoon-orchestrator | "API로 직접 이미지 생성" 요청 |
