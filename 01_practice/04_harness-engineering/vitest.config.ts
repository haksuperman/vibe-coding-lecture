import { defineConfig } from "vitest/config";

export default defineConfig({
  // esbuild로 JSX 자동 런타임 변환(React 19). 별도 플러그인 불필요.
  esbuild: { jsx: "automatic" },
  test: {
    // 기본은 node. 컴포넌트 테스트(.test.tsx)는 파일 상단 docblock으로 jsdom 지정.
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx", "tests/**/*.test.ts"],
  },
});
