// build: 필수 DOM 요소가 있는지 검증하고 dist/index.html로 산출한다.
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";

const root = new URL("../", import.meta.url);
const html = readFileSync(new URL("index.html", root), "utf8");

// 핵심 기능이 의존하는 요소 id가 모두 존재해야 한다.
const requiredIds = [
  "filters",
  "slot",
  "slotName",
  "slotCat",
  "pickBtn",
  "historyList",
  "clearBtn",
  "addForm",
  "inName",
  "inCat",
  "menuGroups",
  "resetMenusBtn",
];

const missing = requiredIds.filter((id) => !html.includes('id="' + id + '"'));
if (missing.length) {
  console.error("❌ build 실패 — 필수 요소 누락: " + missing.join(", "));
  process.exit(1);
}

mkdirSync(new URL("dist/", root), { recursive: true });
writeFileSync(new URL("dist/index.html", root), html);
console.log("✅ build 통과 — dist/index.html 생성");
