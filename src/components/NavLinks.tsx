"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { counterpart, href, langOf } from "@/lib/i18n";

const LINKS = [
  {
    path: "/",
    label: "숲 찾기",
    short: "숲 찾기",
    en: "Find",
    enShort: "Find",
  },
  {
    path: "/gaps",
    label: "전국 빈칸",
    short: "빈칸",
    en: "Data gaps",
    enShort: "Gaps",
  },
  {
    path: "/data",
    label: "데이터 출처",
    short: "출처",
    en: "Data sources",
    enShort: "Data",
  },
  {
    path: "/about",
    label: "소개",
    short: "소개",
    en: "About",
    enShort: "About",
  },
];

export default function NavLinks() {
  const full = usePathname() ?? "/";
  const lang = langOf(full);
  const path = lang === "en" ? full.slice(3) || "/" : full;
  return (
    <div className="flex min-w-0 items-center gap-1">
      <ul className="no-scrollbar flex min-w-0 items-center gap-0.5 overflow-x-auto overflow-y-hidden whitespace-nowrap text-[0.9rem] font-semibold">
        {LINKS.map((l) => {
          const on = l.path === "/" ? path === "/" || path.startsWith("/forest") : path.startsWith(l.path);
          return (
            <li key={l.path}>
              <Link
                href={href(lang, l.path)}
                aria-current={on ? "page" : undefined}
                className={`relative inline-flex min-h-14 items-center px-1.5 sm:px-2.5 ${
                  on ? "text-brand-strong" : "text-muted hover:text-fg"
                }`}
              >
                <span className="sm:hidden">{lang === "en" ? l.enShort : l.short}</span>
                <span className="hidden sm:inline">{lang === "en" ? l.en : l.label}</span>
                {on && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-1.5 bottom-0 h-0.5 rounded bg-brand-strong sm:inset-x-2.5"
                  />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
      {/* 언어 전환은 메뉴가 좁아 가로로 밀려도 항상 보이도록 목록 밖에 둔다 */}
      <Link
        href={counterpart(full)}
        hrefLang={lang === "en" ? "ko" : "en"}
        lang={lang === "en" ? "ko" : "en"}
        className="inline-flex min-h-9 shrink-0 items-center rounded-md border border-line px-2 text-[0.8rem] font-semibold text-fg hover:bg-surface-2"
        aria-label={lang === "en" ? "한국어로 보기" : "View in English"}
      >
        {lang === "en" ? "한국어" : "EN"}
      </Link>
    </div>
  );
}
