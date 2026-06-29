---
name: webtoon-illustration
description: 작화 프롬프트(03_art_prompts)를 받아 OpenAI 이미지 모델(gpt-image-1)로 실제 웹툰 컷 PNG를 생성한다. 캐릭터 일관성을 위해 첫 컷 결과를 이후 컷의 레퍼런스로 연쇄 입력한다. "이미지 만들어줘", "실제로 그려줘", "웹툰 이미지 생성", "컷 렌더링", "OpenAI로 그림 생성"을 요청하거나 작화 프롬프트가 준비돼 실제 이미지가 필요할 때 반드시 이 스킬을 사용할 것. webtoon-illustrator 에이전트가 사용한다.
---

# Webtoon Illustration — GPT Image로 실제 컷 생성

`03_art_prompts_ep{N}.md`의 프롬프트를 실제 PNG 이미지로 렌더링한다. 번들 스크립트 `scripts/generate_image.py`가 OpenAI 이미지 API(`gpt-image-1`)를 호출한다.

## 선행 조건 (없으면 멈추고 안내)
- `_workspace/03_art_prompts_ep{N}.md` 존재
- 환경변수 `OPENAI_API_KEY` 설정 (없으면 사용자에게 `.env` 또는 `export` 안내)
- `openai` SDK 설치 (`pip install openai`)
- **비용 안내**: 이미지 생성은 유료 API다. 컷 수만큼 과금되므로 실행 전 사용자에게 컷 수·예상 호출 횟수를 알리고 승인받는다.

## 핵심 원칙 (왜)
- **프롬프트는 파일로 넘긴다**: 프롬프트가 길고 따옴표·줄바꿈이 많아 셸 이스케이프가 깨지기 쉽다. 각 컷의 최종 프롬프트를 임시 `.txt`로 써서 `--prompt-file`로 전달한다.
- **블록을 직접 조립한다**: `03_art_prompts`의 프롬프트는 `[전역 스타일 블록]`, `[캐릭터 고정 외형 블록]` 같은 플레이스홀더를 쓴다. 스크립트에 넘기기 전, 해당 블록의 실제 텍스트를 치환해 **완성된 단일 프롬프트 문자열**로 만든다.
- **일관성은 레퍼런스 연쇄로**: 캐릭터가 컷마다 흔들리지 않게, 먼저 생성된 컷을 다음 컷의 `--ref`로 넘긴다. 1번 컷은 레퍼런스 없이 생성하고, 이후 컷은 같은 인물이 처음 등장한 컷 이미지를 레퍼런스로 연쇄한다.
- **세로 사양 고정**: 기본 `--size 1024x1536` (portrait). 긴 임팩트 컷 등 특수 컷만 조정.

## 작업 절차

1. `03_art_prompts_ep{N}.md`를 읽어 전역 스타일 블록·캐릭터 고정 외형 블록·컷별 프롬프트·레퍼런스 지침을 파악한다.
2. `OPENAI_API_KEY`·`openai` SDK 가용성을 확인한다. 없으면 멈추고 설치/설정을 안내한다.
3. 사용자에게 컷 수와 예상 호출 횟수를 알리고 실행 승인을 받는다.
4. 출력 폴더 준비: `_workspace/images/`.
5. 각 컷마다:
   - 블록을 치환해 완성 프롬프트를 `_workspace/images/_prompt_cut{n}.txt`에 쓴다.
   - 스크립트 호출:
     ```
     python3 .claude/skills/webtoon-illustration/scripts/generate_image.py \
       --prompt-file _workspace/images/_prompt_cut{n}.txt \
       --out _workspace/images/cut{n}.png \
       [--ref _workspace/images/cut{앞선동일인물컷}.png ...] \
       --size 1024x1536
     ```
   - 1번 컷부터 순서대로. 레퍼런스가 될 컷은 먼저 생성돼 있어야 한다.
6. 생성 결과를 `_workspace/images/`에 모으고, 컷↔파일 매핑을 사용자에게 보고한다.

## 에러 핸들링
- 키/SDK 부재 → 생성 멈추고 정확한 해결 명령(`pip install openai`, `export OPENAI_API_KEY=...`)을 안내. 임의로 진행하지 않는다.
- 특정 컷 실패 → 1회 재시도 후 재실패 시 해당 컷만 건너뛰고 나머지 진행, 최종 보고에 누락 명시.
- 한글 텍스트 렌더링은 불안정하므로 말풍선 대사는 비운 채 생성하고 후편집을 권고한다(작화 프롬프트 원칙과 동일).

## 재실행
- 특정 컷만 다시 그리라는 요청이면 해당 컷 프롬프트만 재생성한다. 레퍼런스 일관성을 위해 앞선 컷 이미지는 유지한다.
