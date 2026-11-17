"use client";
import Link from "next/link";
import { useEffect } from "react";
import { href } from "@/lib/i18n";
import { useLang } from "@/lib/useLang";
import { LogoMark } from "./Icons";
import NavLinks from "./NavLinks";

export function SiteHeader() {
  const { lang, t } = useLang();
  return (
    <header className="border-b border-line bg-surface">
      <nav aria-label={t("주 메뉴", "Main menu")} className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4">
        <Link href={href(lang, "/")} className="flex shrink-0 items-center gap-2 py-3">
          <LogoMark className="h-10 w-9" />
          {/* 영어 메뉴가 길어 좁은 화면에서는 글자 로고를 화면 읽기용으로만 남긴다 */}
          <span className={`flex-col leading-none ${lang === "en" ? "sr-only min-[420px]:not-sr-only min-[420px]:flex" : "flex"}`}>
            <span className="text-lg font-bold tracking-tight text-fg">{t("숲누림", "Soopnurim")}</span>
            <span className="mt-0.5 hidden text-[0.7rem] text-muted sm:block">
              {t("휴양림 여행 정보 확인", "Check before your forest stay")}
            </span>
          </span>
        </Link>
        <NavLinks />
      </nav>
    </header>
  );
}

export function SkipLink() {
  const { lang, t } = useLang();
  // 화면 사이를 오갈 때 문서 언어(html lang)를 현재 경로에 맞춘다 (화면 읽기 프로그램 발음용)
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  return (
    <a href="#main" className="skip-link">
      {t("본문 바로가기", "Skip to content")}
    </a>
  );
}

export function SiteFooter() {
  const { lang, t } = useLang();
  return (
    <footer className="border-t border-line bg-surface px-4 py-8 text-sm text-muted">
      <div className="mx-auto max-w-5xl space-y-2">
        <p className="font-semibold text-fg">
          {t("숲누림은 휴양림의 이용 가능 여부를 판정하지 않습니다.", "Soopnurim does not judge whether a forest is usable for you.")}
        </p>
        <p>
          {t(
            "공공데이터와 확인 정보를 출처·기준일과 함께 보여드립니다. 방문 전 운영기관에 꼭 확인하세요.",
            "It shows public data and checked information with sources and dates. Always confirm with the operator before you go.",
          )}
        </p>
        <p>
          {t(
            "데이터: 산림청·국립자연휴양림관리소·한국산림복지진흥원·행정안전부·국토교통부·제주특별자치도 공공데이터(공공데이터포털, 이용허락범위 제한 없음)",
            "Data: Korea Forest Service, National Forest Recreation Service, Korea Forest Welfare Institute, Ministry of the Interior and Safety, Ministry of Land, Infrastructure and Transport and Jeju Province open data (data.go.kr, no usage restrictions)",
          )}{" "}
          ·{" "}
          <Link href={href(lang, "/data")} className="underline underline-offset-2">
            {t("출처 자세히", "Source details")}
          </Link>
        </p>
      </div>
    </footer>
  );
}
