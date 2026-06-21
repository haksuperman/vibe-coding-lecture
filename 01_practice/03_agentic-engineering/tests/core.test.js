// public/app.js의 핵심 순수 함수에 대한 단위 테스트.
// 프로덕션 코드는 건드리지 않고, vm 로더로 함수를 꺼내 검증한다(의존성 0, 내장 node:test).
import { test } from "node:test";
import assert from "node:assert/strict";
import { loadApp } from "./helpers/load-app.js";

const {
  parseCSV,
  parseDate,
  mapColumns,
  isSystemMessage,
  decodeBuffer,
  renderMarkdown,
  esc,
  serialize,
} = loadApp();

// vm 컨텍스트에서 만들어진 객체/배열은 prototype이 달라 deepStrictEqual에 걸린다.
// 순수 데이터(문자열·숫자·배열·객체)를 테스트 realm으로 정규화해 구조만 비교한다.
const plain = (v) => JSON.parse(JSON.stringify(v));

/* ------------------------------- parseCSV ------------------------------- */

test("parseCSV: 기본 행을 파싱하고 공백을 트림한다", () => {
  const rows = parseCSV("date,user,message\n2026-01-01, 철수 , 안녕");
  assert.deepEqual(plain(rows), [
    ["date", "user", "message"],
    ["2026-01-01", "철수", "안녕"],
  ]);
});

test("parseCSV: 따옴표 안의 콤마는 필드 구분자로 보지 않는다", () => {
  const rows = parseCSV('a,b\n"1,2,3",end');
  assert.deepEqual(plain(rows[1]), ["1,2,3", "end"]);
});

test("parseCSV: 따옴표 안의 개행은 한 필드로 유지한다", () => {
  const rows = parseCSV('a,b\n"여러\n줄",x');
  assert.equal(rows.length, 2);
  assert.deepEqual(plain(rows[1]), ["여러\n줄", "x"]);
});

test('parseCSV: 이스케이프된 큰따옴표("")를 하나의 따옴표로 처리한다', () => {
  const rows = parseCSV('a\n"그는 ""안녕""이라 했다"');
  assert.equal(rows[1][0], '그는 "안녕"이라 했다');
});

test("parseCSV: BOM을 제거하고 빈 줄을 걸러낸다", () => {
  const rows = parseCSV("﻿a,b\n\n1,2\n");
  assert.deepEqual(plain(rows), [
    ["a", "b"],
    ["1", "2"],
  ]);
});

/* ------------------------------- parseDate ------------------------------ */

test("parseDate: 초까지 있는 날짜시간을 파싱한다", () => {
  const d = parseDate("2026-04-03 02:17:46");
  assert.equal(d.getFullYear(), 2026);
  assert.equal(d.getMonth(), 3); // 0-based
  assert.equal(d.getDate(), 3);
  assert.equal(d.getHours(), 2);
  assert.equal(d.getMinutes(), 17);
  assert.equal(d.getSeconds(), 46);
});

test("parseDate: 점 구분·한 자리 시각도 파싱한다", () => {
  const d = parseDate("2026.4.3 2:17");
  assert.equal(d.getMonth(), 3);
  assert.equal(d.getDate(), 3);
  assert.equal(d.getHours(), 2);
  assert.equal(d.getMinutes(), 17);
  assert.equal(d.getSeconds(), 0);
});

test("parseDate: 날짜만 있으면 시각은 0시로 둔다", () => {
  const d = parseDate("2026-04-03");
  assert.equal(d.getHours(), 0);
  assert.equal(d.getMinutes(), 0);
});

test("parseDate: 빈 값/형식 불명은 null", () => {
  assert.equal(parseDate(""), null);
  assert.equal(parseDate(null), null);
  assert.equal(parseDate("형식없음"), null);
});

/* ------------------------------ mapColumns ------------------------------ */

test("mapColumns: 한국어 동의어 헤더를 인덱스로 매핑한다", () => {
  const idx = mapColumns(["일시", "이름", "내용"]);
  assert.deepEqual(plain(idx), { date: 0, user: 1, message: 2 });
});

test("mapColumns: 순서가 섞여 있어도 동의어로 찾는다", () => {
  const idx = mapColumns(["내용", "닉네임", "날짜"]);
  assert.deepEqual(plain(idx), { date: 2, user: 1, message: 0 });
});

test("mapColumns: 매칭 실패 시 위치 폴백 [0,1,2]", () => {
  const idx = mapColumns(["foo", "bar", "baz"]);
  assert.deepEqual(plain(idx), { date: 0, user: 1, message: 2 });
});

/* --------------------------- isSystemMessage ---------------------------- */

test("isSystemMessage: 입퇴장·미디어·삭제 메시지를 시스템으로 본다", () => {
  assert.equal(isSystemMessage("철수님이 나갔습니다."), true);
  assert.equal(isSystemMessage("사진"), true);
  assert.equal(isSystemMessage("삭제된 메시지입니다."), true);
  assert.equal(isSystemMessage(""), true);
});

test("isSystemMessage: 일반 메시지는 통과시킨다", () => {
  assert.equal(isSystemMessage("내일 회의 10시에 할까요?"), false);
});

/* ----------------------------- decodeBuffer ----------------------------- */

test("decodeBuffer: UTF-8 한국어 버퍼를 올바르게 디코딩한다", () => {
  const buf = Buffer.from("안녕하세요, 회의 합니다", "utf-8");
  assert.equal(decodeBuffer(buf), "안녕하세요, 회의 합니다");
});

/* ---------------------------- renderMarkdown ---------------------------- */

test("renderMarkdown: ## 제목을 h3로 변환한다", () => {
  assert.equal(renderMarkdown("## 전체 요약"), "<h3>전체 요약</h3>");
});

test("renderMarkdown: 불릿을 ul/li로 묶는다", () => {
  assert.equal(renderMarkdown("- 하나\n- 둘"), "<ul><li>하나</li><li>둘</li></ul>");
});

test("renderMarkdown: 체크박스 - [ ] / - [x] 를 처리한다", () => {
  const html = renderMarkdown("- [ ] 할일\n- [x] 완료");
  assert.match(html, /<ul class="checklist">/);
  assert.match(html, /type="checkbox" disabled \/> <span>할일<\/span>/);
  assert.match(html, /type="checkbox" disabled checked\/> <span>완료<\/span>/);
});

test("renderMarkdown: **굵게**를 strong으로 변환한다", () => {
  assert.equal(renderMarkdown("이것은 **중요**"), "<p>이것은 <strong>중요</strong></p>");
});

test("renderMarkdown: 일반 텍스트의 HTML 특수문자를 이스케이프한다", () => {
  assert.equal(renderMarkdown("a < b & c"), "<p>a &lt; b &amp; c</p>");
});

/* -------------------------------- esc ----------------------------------- */

test("esc: 5개 특수문자를 엔티티로 바꾼다", () => {
  assert.equal(esc(`<&>"'`), "&lt;&amp;&gt;&quot;&#39;");
});

/* ----------------------------- serialize -------------------------------- */

test("serialize: [MM-DD HH:mm] 사용자: 내용 형식으로 직렬화한다", () => {
  const recs = [{ date: new Date(2026, 3, 3, 2, 17), user: "철수", message: "안녕" }];
  assert.equal(serialize(recs), "[04-03 02:17] 철수: 안녕");
});
