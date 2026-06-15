// test: index.html에 대한 가벼운 스모크/회귀 검사 (브라우저 없이 정적 검사).
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");

let failed = 0;
function check(name, cond) {
  if (cond) {
    console.log("  ✓ " + name);
  } else {
    console.error("  ✗ " + name);
    failed++;
  }
}

// 보안: 사용자 입력을 안전하게 렌더하는가 (textContent 사용)
check("textContent 기반 렌더 사용", html.includes(".textContent"));

// 영속성: localStorage 저장/복원 + 파싱 가드
check("localStorage 저장 사용", html.includes("localStorage.setItem"));
check("JSON.parse 가드 존재", html.includes("JSON.parse"));

// 핵심 상수/상태 존재
check("STORAGE_KEY 정의", html.includes("STORAGE_KEY"));
check("CATEGORY_COLOR 정의", html.includes("CATEGORY_COLOR"));
check("다중 선택(selectedCategories) 사용", html.includes("selectedCategories"));

// 회귀: 제거된 식별자 잔존 참조 없음
check("이모지(emoji) 잔존 참조 없음", !/emoji/i.test(html));
check(
  "단일 selectedCategory는 마이그레이션 외 미사용(<=2회)",
  (html.match(/selectedCategory\b/g) || []).length <= 2
);

if (failed) {
  console.error("\n❌ test 실패 — " + failed + "개 항목 실패");
  process.exit(1);
}
console.log("\n✅ test 통과 — 전체 스모크 검사 OK");
