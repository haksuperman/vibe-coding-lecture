// public/app.js는 클래식 스크립트라 export가 없고 최상단에서 document에 접근한다.
// 프로덕션 코드를 건드리지 않고 테스트하기 위해, vm 컨텍스트에서 소스를 실행하고
// (document·TextDecoder를 stub/주입) 최상단 function 선언들을 꺼내 쓴다.
import { readFileSync } from "node:fs";
import vm from "node:vm";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_PATH = path.join(__dirname, "..", "..", "public", "app.js");

// app.js를 격리된 vm 컨텍스트에서 실행하고, 검증 대상 순수 함수들을 담은 객체를 돌려준다.
export function loadApp() {
  const source = readFileSync(APP_PATH, "utf-8");
  const ctx = {
    // DOMContentLoaded 리스너 등록(app.js 최상단)이 던지지 않도록 최소 stub.
    document: { addEventListener() {} },
    // decodeBuffer가 쓰는 Web API. Uint8Array·Date는 vm 내장이라 주입 불필요.
    TextDecoder,
    console,
  };
  vm.createContext(ctx);
  // 실제 절대경로를 filename으로 주면 --experimental-test-coverage가 app.js에 커버리지를 귀속한다.
  vm.runInContext(source, ctx, { filename: APP_PATH });
  return ctx;
}
