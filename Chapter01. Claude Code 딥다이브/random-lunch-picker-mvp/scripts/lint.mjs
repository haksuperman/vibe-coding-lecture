// lint: index.html 안의 <script> 블록 JS 문법을 검사한다 (외부 의존성 없음).
import { readFileSync } from "node:fs";
import vm from "node:vm";

const htmlUrl = new URL("../index.html", import.meta.url);
const html = readFileSync(htmlUrl, "utf8");
const errors = [];

const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
if (!scriptMatch) {
  errors.push("<script> 블록을 찾지 못했습니다.");
} else {
  const code = scriptMatch[1];
  // 1) 문법 검사 (실행하지 않고 파싱만)
  try {
    new vm.Script(code);
  } catch (e) {
    errors.push("JS 문법 오류: " + e.message);
  }
  // 2) 가벼운 위생 검사 (경고만, 실패 아님)
  if (/\bvar\s/.test(code)) {
    console.log("ℹ️  var 사용 감지 — const/let 사용을 권장합니다.");
  }
  if (/console\.log\(/.test(code)) {
    console.log("ℹ️  console.log 호출이 코드에 남아 있습니다.");
  }
}

if (errors.length) {
  console.error("❌ lint 실패:\n- " + errors.join("\n- "));
  process.exit(1);
}
console.log("✅ lint 통과");
