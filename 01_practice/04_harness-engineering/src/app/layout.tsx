import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CVE Insight",
  description:
    "CVE 번호·URL·뉴스 텍스트를 입력하면 취약점 분석·조치방안·유사 취약점·실습 시나리오를 생성하는 도구",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="dark">
      <body className="min-h-screen bg-neutral-950 text-neutral-100 antialiased">
        {children}
      </body>
    </html>
  );
}
