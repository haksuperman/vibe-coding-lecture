#!/bin/bash
# 스모크 테스트 — 서버를 임시 포트로 띄워 핵심 엔드포인트 응답을 검증하고 자동 종료한다.
# OPENAI_API_KEY가 없어도 동작한다(실제 요약 호출은 검증 대상이 아님).
# 사용: npm run smoke   (포트 변경: SMOKE_PORT=5000 npm run smoke)
set -u

PORT="${SMOKE_PORT:-4123}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LOG="$(mktemp)"
BASE="http://localhost:${PORT}"

# 서버 기동(임시 포트). .env의 PORT를 덮어쓴다.
PORT="$PORT" node "$ROOT/api/server.js" >"$LOG" 2>&1 &
SRV=$!
cleanup() { kill "$SRV" 2>/dev/null; wait "$SRV" 2>/dev/null; }
trap cleanup EXIT

# health가 뜰 때까지 폴링(최대 ~5초). sleep 추측 대신 결정적으로 기다린다.
ready=false
for _ in $(seq 1 50); do
  if curl -fsS "$BASE/api/health" >/dev/null 2>&1; then ready=true; break; fi
  sleep 0.1
done
if [ "$ready" != true ]; then
  echo "✖ 서버 기동 실패 (포트 $PORT)"
  echo "--- 서버 로그 ---"
  cat "$LOG"
  exit 1
fi

fail=0
code() { curl -s -o /dev/null -w "%{http_code}" "$@"; }

H=$(code "$BASE/api/health")
[ "$H" = 200 ] && echo "✔ GET /api/health (200)" || { echo "✖ GET /api/health 기대=200 실제=$H"; fail=1; }

I=$(code "$BASE/")
[ "$I" = 200 ] && echo "✔ GET / (index.html, 200)" || { echo "✖ GET / 기대=200 실제=$I"; fail=1; }

# 요약 라우트: 빈 본문 → 키 유무와 무관하게 4xx/5xx JSON 에러(라우트 연결·입력검증 확인).
S=$(code -X POST "$BASE/api/summarize" -H 'content-type: application/json' -d '{}')
case "$S" in
  400|500) echo "✔ POST /api/summarize 입력검증 ($S)" ;;
  *)       echo "✖ POST /api/summarize 기대=400/500 실제=$S"; fail=1 ;;
esac

echo "---"
if [ "$fail" = 0 ]; then echo "스모크 통과 ✅"; else echo "스모크 실패 ❌ (서버 로그: $LOG)"; fi
exit $fail
