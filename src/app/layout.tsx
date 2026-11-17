import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import SWRegister from "@/components/SWRegister";
import NavLinks from "@/components/NavLinks";
import { LogoMark } from "@/components/Icons";

export const metadata: Metadata = {
  title: { default: "숲누림 – 휴양림 여행 전에 확인할 정보", template: "%s | 숲누림" },
  description:
    "휠체어 이용자·고령자·유아 동반 가족이 자연휴양림 여행 전에 직접 판단할 수 있도록, 산림공공데이터를 도착부터 숙소·화장실·숲길까지 여정 단위로 연결해 출처·기준일과 함께 보여주는 서비스",
  applicationName: "숲누림",
  appleWebApp: { capable: true, title: "숲누림", statusBarStyle: "default" },
  icons: { icon: "/icon.svg", apple: "/icon-192.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body className="min-h-screen antialiased">
        <a href="#main" className="skip-link">
          본문 바로가기
        </a>
        <header className="border-b border-line bg-surface">
          <nav aria-label="주 메뉴" className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4">
            <Link href="/" className="flex shrink-0 items-center gap-2 py-3">
              <LogoMark className="size-8" />
              <span className="flex flex-col leading-none">
                <span className="text-lg font-bold tracking-tight text-fg">숲누림</span>
                <span className="mt-0.5 hidden text-[0.7rem] text-muted sm:block">휴양림 여행 정보 확인</span>
              </span>
            </Link>
            <NavLinks />
          </nav>
        </header>
        <main id="main" className="mx-auto max-w-5xl px-4 pb-20 pt-5">
          {children}
        </main>
        <footer className="border-t border-line bg-surface px-4 py-8 text-sm text-muted">
          <div className="mx-auto max-w-5xl space-y-2">
            <p className="font-semibold text-fg">숲누림은 휴양림의 이용 가능 여부를 판정하지 않습니다.</p>
            <p>공공데이터와 확인 정보를 출처·기준일과 함께 보여드립니다. 방문 전 운영기관에 꼭 확인하세요.</p>
            <p>
              데이터: 산림청·국립자연휴양림관리소·한국산림복지진흥원·행정안전부·제주특별자치도 공공데이터(공공데이터포털,
              이용허락범위 제한 없음) ·{" "}
              <Link href="/data" className="underline underline-offset-2">
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
