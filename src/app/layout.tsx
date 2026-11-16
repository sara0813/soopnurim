import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import SWRegister from "@/components/SWRegister";

export const metadata: Metadata = {
  title: { default: "숲누림 – 갈 수 있는 숲의 정보 빈칸 찾기", template: "%s | 숲누림" },
  description:
    "휠체어 이용자·고령자·유아 동반 가족이 자연휴양림 여행 전에 직접 판단할 수 있도록, 산림공공데이터와 확인 정보를 여정 단계별로 연결해 보여주는 서비스",
  applicationName: "숲누림",
  appleWebApp: { capable: true, title: "숲누림", statusBarStyle: "default" },
  icons: { icon: "/icon.svg", apple: "/icon-192.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1f6b45",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body className="min-h-screen antialiased">
        <a href="#main" className="skip-link">
          본문 바로가기
        </a>
        <header className="border-b border-line bg-surface">
          <nav
            aria-label="주 메뉴"
            className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-2"
          >
            <Link href="/" className="flex items-center gap-2 py-2 text-xl font-extrabold text-brand-strong">
              <span aria-hidden="true">🌲</span> 숲누림
            </Link>
            <ul className="flex gap-1 text-base font-semibold">
              <li>
                <Link href="/" className="inline-block rounded-lg px-3 py-3 hover:bg-brand-soft">
                  숲 찾기
                </Link>
              </li>
              <li>
                <Link href="/gaps" className="inline-block rounded-lg px-3 py-3 hover:bg-brand-soft">
                  전국 빈칸
                </Link>
              </li>
              <li>
                <Link href="/about" className="inline-block rounded-lg px-3 py-3 hover:bg-brand-soft">
                  소개·출처
                </Link>
              </li>
            </ul>
          </nav>
        </header>
        <main id="main" className="mx-auto max-w-5xl px-4 pb-16 pt-4">
          {children}
        </main>
        <footer className="border-t border-line px-4 py-6 text-sm text-muted">
          <div className="mx-auto max-w-5xl space-y-1">
            <p>
              숲누림은 휴양림의 이용 가능 여부를 판정하지 않습니다. 공공데이터와 확인 정보를 출처·기준일과 함께 보여드리니,
              방문 전 운영기관에 꼭 확인하세요.
            </p>
            <p>
              데이터: 산림청·한국산림복지진흥원·제주특별자치도 공공데이터(공공데이터포털, 이용허락범위 제한 없음) ·{" "}
              <Link href="/about" className="underline">
                출처 자세히
              </Link>
            </p>
          </div>
        </footer>
        <SWRegister />
        <Analytics />
      </body>
    </html>
  );
}
