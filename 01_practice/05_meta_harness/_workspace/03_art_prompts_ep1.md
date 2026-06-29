# 커밋 가드 — 클로디 1화 작화 프롬프트 (GPT Image 2)

> 모델 입력은 영문 프롬프트, 이해용 주석은 한국어. 모든 컷에 전역 스타일 블록 + 등장 캐릭터 고정 외형 블록을 앞에 붙여 일관성 유지. 말풍선 한글 대사는 비우고 후편집(SFX만 짧은 영문 허용). 컷 번호는 콘티와 1:1.

## 전역 스타일 블록 (모든 프롬프트 앞에 공통 삽입)
```
Style: soft cel-shaded Korean webtoon illustration, clean confident lineart, gentle gradient shading, medium-high saturation, cozy late-night home-office mood. Lighting: warm orange desk-lamp glow contrasting with cool blue monitor light. Vertical webtoon panel composition, cinematic depth. Digital beings (the AI mascot and the gremlin) have a soft luminous glow; the human is rendered in normal flat coloring. No text in speech bubbles (leave them empty for post-editing); only short English SFX/UI text where specified.
```

## 캐릭터 고정 외형 블록 (등장 컷마다 그대로 복사)
### 도현 (Dohyun)
```
Dohyun is a 28-year-old Korean male junior developer. Messy short black hair slightly sticking up, dark brown eyes with heavy dark circles, black thick-rimmed glasses. Slim build, around 175cm, slightly hunched posture. Wears a charcoal-gray hoodie with drawstrings over a plain black t-shirt. Tired but earnest expression. Holds or sits near a white mug printed with a small star (✳) mark. Rendered in normal flat webtoon coloring, no glow.
```
### 클로디 (Claudy)
```
Claudy is a small palm-sized round AI mascot. Smooth matte coral-orange rounded body with a soft holographic glow. A single thin antenna on top ends in a glowing star-burst symbol (✳, radiating lines). Two simple black dot eyes and a blinking terminal-cursor underscore (_) as a mouth. Short rounded stub arms. Calm, friendly, but determined.
```
### 키도깨비 (Key-Gremlin)
```
The Key-Gremlin is a small mischievous goblin slightly smaller than Claudy. Its body is shaped like a glossy brass key (the head is its face, the key teeth are its legs). Two small red horns, narrow sly eyes, a smirking grin with tiny fangs. A dangling label tag on its back reads "sk-live-...". Trails a faint purple glitch afterimage.
```

## 컷 1 프롬프트
- Prompt (EN):
```
[전역 스타일 블록]
Medium bust shot, slight over-the-shoulder angle. On the left, Dohyun is seen in profile yawning at his desk late at night; on the right, dual monitors. The code editor on the monitor clearly shows one highlighted line of code reading `API_KEY = "sk-live-..."`, subtly brighter than the surrounding code to draw the eye. A terminal window shows a typed command `git commit -m "done" && git push` with the cursor hovering over Enter. A white star-marked mug sits at the front of the desk. Warm desk-lamp glow on Dohyun, cool blue monitor light on his face. Calm, quiet mood, empty speech bubble near Dohyun.
[도현 고정 외형 블록]
```
- Size: 1024x1536 (portrait)
- Reference: 신규(1번 컷, 레퍼런스 없음). 이 컷에서 생성된 도현 이미지를 컷2·컷3의 레퍼런스로 보관.
- 주석(KR): 도입 컷. 핵심은 모니터의 `API_KEY = "sk-live-..."` 한 줄을 화면 안 텍스트로 또렷이 렌더링해 보안 위험을 '말 없이' 보여주는 것. 그 줄만 살짝 밝게. 차분한 호흡.

## 컷 2 프롬프트
- Prompt (EN):
```
[전역 스타일 블록]
Large dramatic vertical impact panel, slightly low angle with strong depth. In the center, the Key-Gremlin bursts out from between the lines of code, fleeing toward a glowing doorway in the upper-right labeled "PUBLIC REPO", trailing a purple glitch afterimage. Rising up from the terminal, the glowing coral AI mascot Claudy grabs and blocks the Key-Gremlin, stopping its escape. A terminal window on the right shows a red warning UI text: "Blocked: hardcoded secret detected (sk-live-...)". In the lower-left, Dohyun's shocked face with wide eyes. Tense, high-energy moment. Empty speech bubbles for Claudy, the gremlin, and Dohyun.
[도현 고정 외형 블록]
[클로디 고정 외형 블록]
[키도깨비 고정 외형 블록]
```
- Size: 1024x1536 (portrait)
- Reference: 컷1의 도현 결과 이미지를 `images.edit` 다중 입력 레퍼런스로 넣어 동일 인물 유지. 클로디·키도깨비는 첫 등장이므로 고정 외형 블록으로 정의(이 컷 결과를 컷3 레퍼런스로 보관).
- 주석(KR): 절정 임팩트 컷. 빨간 경고 UI 텍스트 "Blocked: hardcoded secret detected (sk-live-...)"는 영문이라 렌더링 안정적 — 보안 포착 메시지를 화면 안에 직접 노출. 빛의 문→클로디→도현 대각선 시선. 가장 큰 단독 세로 컷.

## 컷 3 프롬프트
- Prompt (EN):
```
[전역 스타일 블록]
Medium two-shot, stable near-frontal angle with a slight high angle. In the center, a locked treasure-box labeled ".env" holds the now-calm Key-Gremlin sealed inside behind a padlock. Claudy floats above it giving a wink with one dot-eye. A terminal window shows green UI text: "Safe: key moved to .env, added to .gitignore". On the left, Dohyun wiping sweat off his forehead with a relieved, relaxed posture. In the lower-right corner, hidden in shadow, a faint ominous silhouette with glowing eyes and a small label "SQL INJECTION". Warm, relieved mood with green safety accents. Empty speech bubbles for Claudy and Dohyun.
[도현 고정 외형 블록]
[클로디 고정 외형 블록]
[키도깨비 고정 외형 블록]
```
- Size: 1024x1536 (portrait)
- Reference: 컷2의 도현·클로디·키도깨비 결과 이미지를 `images.edit` 다중 입력 레퍼런스로 넣어 세 캐릭터 동일성 유지.
- 주석(KR): 훅 컷. 초록 안전 UI 텍스트로 올바른 습관(.env 이동 + .gitignore 등록)을 화면 안에 명시해 계몽 메시지 마무리. 우하단 'SQL INJECTION' 그림자 실루엣은 작게, 라벨만 — 다음 화 떡밥. 안도 톤으로 호흡 풀기.
