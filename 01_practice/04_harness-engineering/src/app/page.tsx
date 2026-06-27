import AnalyzeForm from "../components/AnalyzeForm";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-6 py-16">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">CVE Insight</h1>
        <p className="text-neutral-400">
          CVE 번호·URL·뉴스 텍스트를 입력하면 취약점 분석·조치방안·유사 취약점·실습
          시나리오를 생성합니다.
        </p>
      </header>
      <AnalyzeForm />
    </main>
  );
}
