"use strict";

/* ------------------------------------------------------------------ *
 * 카드 내역서 분석기
 * 모든 처리는 브라우저 안에서만 이루어진다 (서버 전송 없음).
 * ------------------------------------------------------------------ */

// 컬럼명 자동 인식을 위한 한국 카드사 동의어 사전.
const COLUMN_SYNONYMS = {
  // 각 배열은 "우선순위 순서"다. 자동 매핑은 앞쪽 동의어부터 맞춰본다.
  date: ["이용일자", "거래일시", "거래일자", "승인일자", "매출일자", "사용일자", "이용일", "거래일", "승인일", "사용일", "일자", "날짜", "date"],
  merchant: ["가맹점명", "가맹점", "가맹점이름", "보낸분/받는분", "받는분", "보낸분", "이용하신곳", "사용처", "상호", "적요", "이용내용", "내용", "merchant", "store"],
  // 출금액(지출)을 입금액보다 우선해서 잡는다. 통장 거래내역 대응.
  amount: ["이용금액", "승인금액", "결제금액", "사용금액", "매출금액", "출금액", "청구금액", "거래금액", "금액", "amount"],
  category: ["카테고리", "업종", "분류", "가맹점업종", "이용구분", "구분", "category", "type"],
};

// 카테고리 컬럼이 없을 때 가맹점명으로 추정하는 키워드 규칙.
const CATEGORY_KEYWORDS = [
  ["식비/카페", ["스타벅스", "커피", "카페", "베이커리", "파리바게뜨", "투썸", "이디야", "식당", "김밥", "분식", "맥도날드", "버거", "치킨", "피자", "배달", "배민", "요기요"]],
  ["마트/편의점", ["이마트", "홈플러스", "롯데마트", "코스트코", "마트", "편의점", "gs25", "cu", "세븐일레븐", "이마트24"]],
  ["교통", ["택시", "카카오t", "지하철", "버스", "주유", "ses", "gs칼텍스", "sk에너지", "주차", "하이패스", "코레일", "ktx", "철도"]],
  ["쇼핑", ["쿠팡", "지마켓", "11번가", "옥션", "네이버페이", "무신사", "올리브영", "다이소", "백화점", "아울렛"]],
  ["통신/구독", ["skt", "kt", "lg유플러스", "통신", "넷플릭스", "유튜브", "멜론", "스포티파이", "구독", "애플", "google"]],
  ["의료/건강", ["병원", "약국", "의원", "치과", "한의원", "헬스", "피트니스"]],
  ["문화/여가", ["영화", "cgv", "메가박스", "롯데시네마", "서점", "교보문고", "yes24", "게임", "노래"]],
];

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

// 분석 대상 파싱 결과를 담아 두는 전역 상태.
let parsedRows = null;   // 헤더를 제외한 데이터 행 배열 (배열의 배열)
let parsedHeader = null; // 헤더 문자열 배열

/* ---------------------------- CSV 읽기 ---------------------------- */

// 카드사 CSV는 EUC-KR(CP949)인 경우가 많다. UTF-8로 먼저 디코딩해 보고
// 깨짐(�)이 많으면 EUC-KR로 다시 디코딩한다.
function decodeBuffer(buffer) {
  const bytes = new Uint8Array(buffer);
  const utf8 = new TextDecoder("utf-8").decode(bytes);
  const replacements = (utf8.match(/�/g) || []).length;
  if (replacements > 0) {
    try {
      return new TextDecoder("euc-kr").decode(bytes);
    } catch (e) {
      return utf8; // 브라우저가 euc-kr을 지원하지 않으면 utf-8 결과라도 반환
    }
  }
  return utf8;
}

// 따옴표로 감싼 필드, 필드 안의 콤마/줄바꿈을 처리하는 CSV 파서.
function parseCSV(text) {
  const rows = [];
  let field = "";
  let row = [];
  let inQuotes = false;
  text = text.replace(/^﻿/, ""); // BOM 제거

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field); field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      rows.push(row); row = [];
    } else field += c;
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }

  // 완전히 빈 행은 제거
  return rows
    .map((r) => r.map((c) => c.trim()))
    .filter((r) => r.some((c) => c !== ""));
}

// 카드사 CSV는 앞부분에 안내문/요약 줄이 붙는 경우가 있다.
// "날짜처럼 보이는 값"과 "금액처럼 보이는 값"이 동시에 들어 있는
// 가장 그럴듯한 행을 헤더로 보고 그 다음부터를 데이터로 본다.
function findHeaderRow(rows) {
  for (let i = 0; i < rows.length; i++) {
    const cells = rows[i];
    if (cells.length < 2) continue;
    const lower = cells.map((c) => c.toLowerCase());
    const hasDate = lower.some((c) => matchColumn(c) === "date");
    const hasAmount = lower.some((c) => matchColumn(c) === "amount");
    if (hasDate && hasAmount) return i;
  }
  // 못 찾으면 첫 행을 헤더로 간주
  return 0;
}

// 헤더 셀 하나가 어떤 의미의 컬럼인지 판정한다 (헤더 행 탐색용).
function matchColumn(header) {
  const h = normHeader(header);
  for (const [key, names] of Object.entries(COLUMN_SYNONYMS)) {
    if (names.some((n) => h === n.toLowerCase() || h.includes(n.toLowerCase()))) {
      return key;
    }
  }
  return null;
}

function normHeader(header) {
  return header.toLowerCase().replace(/\s/g, "");
}

// 헤더 배열 전체를 보고 각 의미(날짜/가맹점/금액/카테고리)에 가장 알맞은
// 컬럼을 고른다. 동의어를 우선순위 순서로 훑어, 먼저 맞는 컬럼을 채택한다.
// (예: 통장 내역의 "출금액"을 "입금액"보다, "보낸분/받는분"을 "적요"보다 우선)
function autoMapColumns(header) {
  const norms = header.map((h) => ({ raw: h, norm: normHeader(h) }));
  const used = new Set();
  const map = { date: "", merchant: "", amount: "", category: "" };
  for (const [key, names] of Object.entries(COLUMN_SYNONYMS)) {
    for (const name of names) {
      const n = name.toLowerCase();
      const hit = norms.find((c) => !used.has(c.raw) && (c.norm === n || c.norm.includes(n)));
      if (hit) { map[key] = hit.raw; used.add(hit.raw); break; }
    }
  }
  return map;
}

/* --------------------------- 값 파싱 --------------------------- */

// "12,300", "₩12,300", "-3,000원" 등을 숫자로 변환.
function parseAmount(raw) {
  if (raw == null) return NaN;
  let s = String(raw).replace(/[^0-9.\-]/g, "");
  if (s === "" || s === "-" || s === ".") return NaN;
  return parseFloat(s);
}

// "2026-06-15", "2026.06.15", "2026/6/15", "20260615" 등을 Date로 변환.
function parseDate(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  let m = s.match(/(\d{4})\D?(\d{1,2})\D?(\d{1,2})/);
  if (m) {
    const d = new Date(+m[1], +m[2] - 1, +m[3]);
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function formatWon(n) {
  const rounded = Math.round(n);
  return rounded.toLocaleString("ko-KR") + "원";
}

// 좁은 공간용 짧은 표기: 12300 → "1.2만", 1500000 → "150만", 23000000 → "2.3천만".
function compactWon(n) {
  const v = Math.round(n);
  if (v >= 100000000) return (v / 100000000).toFixed(1).replace(/\.0$/, "") + "억";
  if (v >= 10000000) return Math.round(v / 10000000 * 10) / 10 + "천만";
  if (v >= 10000) return (v / 10000).toFixed(v >= 100000 ? 0 : 1).replace(/\.0$/, "") + "만";
  if (v >= 1000) return (v / 1000).toFixed(1).replace(/\.0$/, "") + "천";
  return v.toLocaleString("ko-KR");
}

// 가맹점명으로 카테고리 추정 (카테고리 컬럼이 없을 때).
function guessCategory(merchant) {
  const m = (merchant || "").toLowerCase();
  for (const [cat, keywords] of CATEGORY_KEYWORDS) {
    if (keywords.some((k) => m.includes(k))) return cat;
  }
  return "기타";
}

/* --------------------------- 분석 --------------------------- */

function analyze(rows, header, mapping) {
  const idx = {
    date: header.indexOf(mapping.date),
    merchant: header.indexOf(mapping.merchant),
    amount: header.indexOf(mapping.amount),
    category: mapping.category ? header.indexOf(mapping.category) : -1,
  };

  const records = [];
  for (const r of rows) {
    const amount = parseAmount(r[idx.amount]);
    const date = parseDate(r[idx.date]);
    if (isNaN(amount) || !date) continue; // 합계행/빈행 등은 건너뜀
    const merchant = idx.merchant >= 0 ? r[idx.merchant] || "(미상)" : "(미상)";
    let category = idx.category >= 0 ? r[idx.category] : "";
    if (!category) category = guessCategory(merchant);
    records.push({ date, merchant, amount, category });
  }

  if (records.length === 0) return null;

  // 지출만 집계 (양수). 환불/취소(음수)는 합계에서 차감.
  const net = records.reduce((s, r) => s + r.amount, 0);
  const spend = records.filter((r) => r.amount > 0);
  const totalSpend = spend.reduce((s, r) => s + r.amount, 0);

  const dates = records.map((r) => r.date.getTime());
  const minDate = new Date(Math.min(...dates));
  const maxDate = new Date(Math.max(...dates));
  const days = Math.max(1, Math.round((maxDate - minDate) / 86400000) + 1);

  // 월별
  const byMonth = groupSum(spend, (r) => `${r.date.getFullYear()}-${String(r.date.getMonth() + 1).padStart(2, "0")}`);
  // 카테고리별
  const byCategory = groupSum(spend, (r) => r.category);
  // 요일별
  const byWeekday = new Array(7).fill(0);
  spend.forEach((r) => { byWeekday[r.date.getDay()] += r.amount; });
  // 가맹점별
  const byMerchant = groupSum(spend, (r) => r.merchant);

  // 최고 지출일 (로컬 시간대 기준 날짜 키)
  const byDay = groupSum(spend, (r) => localDateKey(r.date));
  const topDay = Object.entries(byDay).sort((a, b) => b[1] - a[1])[0];

  const monthCount = Object.keys(byMonth).length || 1;

  return {
    recordCount: records.length,
    spendCount: spend.length, // 실제 지출(양수) 건수. 통장 입금 건은 제외.
    totalSpend,
    net,
    minDate, maxDate, days,
    dailyAvg: totalSpend / days,
    monthlyAvg: totalSpend / monthCount,
    topDay: topDay ? { date: topDay[0], amount: topDay[1] } : null,
    byMonth: sortByKey(byMonth),
    byCategory: sortByValueDesc(byCategory),
    byWeekday: WEEKDAYS.map((d, i) => [d, byWeekday[i]]),
    topMerchants: sortByValueDesc(byMerchant).slice(0, 10),
    merchantCounts: countBy(spend, (r) => r.merchant),
  };
}

function groupSum(arr, keyFn) {
  const out = {};
  for (const item of arr) {
    const k = keyFn(item);
    out[k] = (out[k] || 0) + item.amount;
  }
  return out;
}
function countBy(arr, keyFn) {
  const out = {};
  for (const item of arr) { const k = keyFn(item); out[k] = (out[k] || 0) + 1; }
  return out;
}
function localDateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function sortByKey(obj) { return Object.entries(obj).sort((a, b) => a[0].localeCompare(b[0])); }
function sortByValueDesc(obj) { return Object.entries(obj).sort((a, b) => b[1] - a[1]); }

/* --------------------------- 렌더링 --------------------------- */

// 도넛/막대에 쓰는 트렌디한 색 팔레트.
const PALETTE = ["#6366f1", "#8b5cf6", "#d946ef", "#ec4899", "#f59e0b", "#10b981", "#06b6d4", "#f43f5e"];

function renderDashboard(a) {
  // 요약 카드 (첫 번째 = 강조용 hero)
  const summary = [
    { label: "총 지출", value: formatWon(a.totalSpend), sub: `${a.spendCount}건`, hero: true },
    { label: "분석 기간", value: `${a.days}일`, sub: `${fmtDate(a.minDate)} ~ ${fmtDate(a.maxDate)}` },
    { label: "일평균 지출", value: formatWon(a.dailyAvg) },
    { label: "월평균 지출", value: formatWon(a.monthlyAvg) },
  ];
  if (a.topDay) {
    summary.push({ label: "가장 많이 쓴 날", value: formatWon(a.topDay.amount), sub: a.topDay.date });
  }
  if (Math.abs(a.net - a.totalSpend) > 0.5) {
    summary.push({ label: "환불/취소 반영 순지출", value: formatWon(a.net) });
  }
  document.getElementById("summary-cards").innerHTML = summary.map((s) => `
    <div class="summary-item${s.hero ? " hero" : ""}">
      <div class="label">${esc(s.label)}</div>
      <div class="value">${esc(s.value)}</div>
      ${s.sub ? `<div class="sub">${esc(s.sub)}</div>` : ""}
    </div>`).join("");

  renderDonutChart("category-chart", a.byCategory);
  renderColumnChart("weekday-chart", a.byWeekday);
  renderBarChart("monthly-chart", a.byMonth);

  // 가맹점 TOP 10
  const rows = a.topMerchants.map(([name, amt], i) => `
    <tr>
      <td><span class="rank-badge${i < 3 ? " top" : ""}">${i + 1}</span></td>
      <td class="merchant">${esc(name)}</td>
      <td class="num">${a.merchantCounts[name]}회</td>
      <td class="num">${formatWon(amt)}</td>
    </tr>`).join("");
  document.getElementById("top-merchants").innerHTML =
    `<thead><tr><th></th><th>가맹점</th><th class="num">이용</th><th class="num">금액</th></tr></thead><tbody>${rows}</tbody>`;
}

// 카테고리 비중을 도넛 + 범례로 표시. 상위 7개 + 나머지는 "그 외"로 묶는다.
function renderDonutChart(elId, entries) {
  const total = entries.reduce((s, e) => s + e[1], 0) || 1;
  let items = entries.slice(0, 7).map(([name, val], i) => ({ name, val, color: PALETTE[i % PALETTE.length] }));
  const rest = entries.slice(7).reduce((s, e) => s + e[1], 0);
  if (rest > 0) items.push({ name: "그 외", val: rest, color: "#cbd2dc" });

  const r = 70, sw = 26, C = 2 * Math.PI * r;
  let offset = 0;
  const arcs = items.map((it) => {
    const len = (it.val / total) * C;
    const seg = `<circle cx="90" cy="90" r="${r}" fill="none" stroke="${it.color}" stroke-width="${sw}"
      stroke-dasharray="${len} ${C - len}" stroke-dashoffset="${-offset}" />`;
    offset += len;
    return seg;
  }).join("");

  const top = items[0];
  const topPct = ((top.val / total) * 100).toFixed(0);
  const legend = items.map((it) => `
    <div class="legend-row">
      <span class="legend-dot" style="background:${it.color}"></span>
      <span class="legend-name" title="${esc(it.name)}">${esc(it.name)}</span>
      <span class="legend-val">${formatWon(it.val)}<span class="pct">${((it.val / total) * 100).toFixed(1)}%</span></span>
    </div>`).join("");

  document.getElementById(elId).innerHTML = `
    <div class="donut">
      <svg width="180" height="180" viewBox="0 0 180 180">${arcs}</svg>
      <div class="donut-center">
        <div class="pct">${topPct}%</div>
        <div class="name">${esc(top.name)}</div>
      </div>
    </div>
    <div class="legend">${legend}</div>`;
}

// 요일별 지출을 세로 막대로 표시. 가장 큰 요일은 색 강조.
function renderColumnChart(elId, entries) {
  const max = Math.max(...entries.map((e) => e[1]), 1);
  document.getElementById(elId).innerHTML = entries.map(([label, val], i) => {
    const h = (val / max) * 100;
    const peak = val === max && val > 0;
    const weekend = i === 0 || i === 6;
    const amt = val > 0 ? compactWon(val) : "-";
    return `<div class="col-item${weekend ? " is-weekend" : ""}">
      <div class="col-amt">${amt}</div>
      <div class="col-bar-wrap"><div class="col-bar${peak ? " peak" : ""}" style="height:${h}%"></div></div>
      <div class="col-label">${esc(label)}</div>
    </div>`;
  }).join("");
}

function renderBarChart(elId, entries) {
  const max = Math.max(...entries.map((e) => e[1]), 1);
  const total = entries.reduce((s, e) => s + e[1], 0) || 1;
  document.getElementById(elId).innerHTML = entries.map(([label, val]) => {
    const pct = (val / max) * 100;
    const share = ((val / total) * 100).toFixed(1);
    return `<div class="bar-row">
      <div class="bar-label" title="${esc(label)}">${esc(label)}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div>
      <div class="bar-value">${formatWon(val)}<span class="pct">${share}%</span></div>
    </div>`;
  }).join("");
}

function fmtDate(d) {
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}
function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

/* --------------------------- 흐름 제어 --------------------------- */

function handleText(text) {
  handleRows(parseCSV(text));
}

// 이미 2차원 배열(행 × 셀)로 파싱된 데이터를 받아 분석으로 넘긴다.
// CSV/Excel 어느 쪽에서 왔든 이 지점부터는 동일하게 처리된다.
function handleRows(all) {
  hideError();
  // 모든 셀을 문자열로 정규화 (Excel은 숫자/날짜를 그대로 줄 수 있음)
  all = all
    .map((r) => r.map((c) => (c == null ? "" : String(c).trim())))
    .filter((r) => r.some((c) => c !== ""));
  if (all.length < 2) {
    showError("파일에서 데이터를 찾지 못했어요. 내용을 확인해 주세요.");
    return;
  }
  const headerIdx = findHeaderRow(all);
  parsedHeader = all[headerIdx];
  parsedRows = all.slice(headerIdx + 1).filter((r) => r.length >= parsedHeader.length - 1);

  // 자동 매핑 (우선순위 기반)
  const auto = autoMapColumns(parsedHeader);

  if (!auto.date || !auto.amount) {
    showError("날짜 또는 금액 컬럼을 자동으로 찾지 못했어요. 아래에서 직접 지정해 주세요.");
  }
  buildMappingUI(auto);
  document.getElementById("upload-section").hidden = true;
  document.getElementById("mapping-section").hidden = false;
  runAnalysis(); // 자동 매핑으로 일단 분석 시도
}

function buildMappingUI(selected) {
  const fields = ["date", "merchant", "amount", "category"];
  fields.forEach((f) => {
    const sel = document.getElementById("map-" + f);
    const allowEmpty = f === "category" || f === "merchant";
    sel.innerHTML =
      (allowEmpty ? '<option value="">(없음)</option>' : "") +
      parsedHeader.map((h) => `<option value="${esc(h)}" ${h === selected[f] ? "selected" : ""}>${esc(h)}</option>`).join("");
  });
}

function runAnalysis() {
  const mapping = {
    date: document.getElementById("map-date").value,
    merchant: document.getElementById("map-merchant").value,
    amount: document.getElementById("map-amount").value,
    category: document.getElementById("map-category").value,
  };
  if (!mapping.date || !mapping.amount) {
    document.getElementById("dashboard").hidden = true;
    return;
  }
  const result = analyze(parsedRows, parsedHeader, mapping);
  if (!result) {
    showError("유효한 거래 내역을 찾지 못했어요. 날짜/금액 컬럼이 올바른지 확인해 주세요.");
    document.getElementById("dashboard").hidden = true;
    return;
  }
  hideError();
  renderDashboard(result);
  document.getElementById("dashboard").hidden = false;
}

function resetApp() {
  parsedRows = parsedHeader = null;
  document.getElementById("file-input").value = "";
  document.getElementById("upload-section").hidden = false;
  document.getElementById("mapping-section").hidden = true;
  document.getElementById("dashboard").hidden = true;
  hideError();
}

function showError(msg) {
  const el = document.getElementById("parse-error");
  el.textContent = msg;
  el.hidden = false;
}
function hideError() { document.getElementById("parse-error").hidden = true; }

/* --------------------------- 이벤트 --------------------------- */

function readFile(file) {
  if (!file) return;
  const isExcel = /\.(xlsx?|xlsm|xlsb)$/i.test(file.name);
  const reader = new FileReader();
  reader.onerror = () => showError("파일을 읽지 못했어요.");
  reader.onload = (e) => {
    if (isExcel) parseExcel(e.target.result);
    else handleText(decodeBuffer(e.target.result));
  };
  reader.readAsArrayBuffer(file);
}

// SheetJS로 .xls/.xlsx를 읽어 첫 번째 시트를 2차원 배열로 변환한다.
function parseExcel(buffer) {
  if (typeof XLSX === "undefined") {
    showError("Excel 파서를 불러오지 못했어요. xlsx.full.min.js 파일이 있는지 확인해 주세요.");
    return;
  }
  try {
    const wb = XLSX.read(buffer, { type: "array", cellDates: true });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    // header:1 → 행 단위 배열의 배열. 날짜 셀은 Date 객체로 들어온다.
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: "" });
    handleRows(rows.map((r) => r.map(cellToString)));
  } catch (err) {
    showError("Excel 파일을 읽는 중 오류가 났어요: " + err.message);
  }
}

// Excel 셀 값(문자열/숫자/Date)을 분석 파이프라인이 기대하는 문자열로 변환.
function cellToString(v) {
  if (v == null) return "";
  if (v instanceof Date) return localDateKey(v); // YYYY-MM-DD
  return String(v);
}

if (typeof document !== "undefined") {
document.addEventListener("DOMContentLoaded", () => {
  const dropzone = document.getElementById("dropzone");
  const input = document.getElementById("file-input");

  dropzone.addEventListener("click", () => input.click());
  input.addEventListener("change", (e) => readFile(e.target.files[0]));

  ["dragenter", "dragover"].forEach((ev) =>
    dropzone.addEventListener(ev, (e) => { e.preventDefault(); dropzone.classList.add("dragover"); }));
  ["dragleave", "drop"].forEach((ev) =>
    dropzone.addEventListener(ev, (e) => { e.preventDefault(); dropzone.classList.remove("dragover"); }));
  dropzone.addEventListener("drop", (e) => readFile(e.dataTransfer.files[0]));

  document.getElementById("reanalyze").addEventListener("click", runAnalysis);
  document.getElementById("reset").addEventListener("click", resetApp);
  document.getElementById("load-sample").addEventListener("click", () => handleText(SAMPLE_CSV));
});
}

/* --------------------------- 샘플 데이터 --------------------------- */

const SAMPLE_CSV = `이용일자,가맹점명,이용금액,업종
2026-05-02,스타벅스 강남점,5800,카페
2026-05-03,GS25 역삼점,4200,편의점
2026-05-03,카카오T 택시,12300,교통
2026-05-05,쿠팡,38900,쇼핑
2026-05-07,이마트 성수점,64500,마트
2026-05-09,넷플릭스,13500,구독
2026-05-11,배달의민족,23000,식비
2026-05-14,GS칼텍스 주유소,70000,교통
2026-05-15,올리브영,18700,쇼핑
2026-05-18,CGV 용산,28000,문화
2026-05-21,투썸플레이스,6500,카페
2026-05-22,쿠팡,15600,쇼핑
2026-05-25,교보문고,32000,문화
2026-05-28,이마트 성수점,52300,마트
2026-05-30,SKT 통신요금,55000,통신
2026-06-01,스타벅스 강남점,5800,카페
2026-06-02,배달의민족,18500,식비
2026-06-03,쿠팡,-15600,쇼핑
2026-06-04,GS25 역삼점,3800,편의점
2026-06-06,카카오T 택시,9800,교통
2026-06-08,홈플러스 합정점,73200,마트
2026-06-10,넷플릭스,13500,구독
2026-06-12,약국,8400,의료
2026-06-13,메가박스,15000,문화`;

// Node 환경에서 로직 테스트를 위한 export (브라우저에는 영향 없음).
if (typeof module !== "undefined" && module.exports) {
  module.exports = { parseCSV, findHeaderRow, matchColumn, autoMapColumns, parseAmount, parseDate, guessCategory, analyze, SAMPLE_CSV };
}
