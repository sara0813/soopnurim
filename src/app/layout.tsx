import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import SWRegister from "@/components/SWRegister";
import { SiteFooter, SiteHeader, SkipLink } from "@/components/SiteChrome";

export const metadata: Metadata = {
  title: { default: "숲누림 – 휴양림 여행 전에 확인할 정보", template: "%s | 숲누림" },
  description:
    "휠체어 이용자·고령자·유아 동반 가족·외국인 여행자가 자연휴양림 여행 전에 직접 판단할 수 있도록, 산림공공데이터를 예약부터 숙소·화장실·숲길까지 여정 단위로 연결해 출처·기준일과 함께 보여주는 서비스",
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
        <SkipLink />
        <SiteHeader />
        <main id="main" className="mx-auto max-w-5xl px-4 pb-20 pt-5">
          {children}
        </main>
        <SiteFooter />
        <SWRegister />
        <Analytics />
      </body>
    </html>
  );
}
