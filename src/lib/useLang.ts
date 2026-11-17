"use client";
import { usePathname } from "next/navigation";
import { langOf, pick, type Lang } from "./i18n";

/** 현재 화면 언어 (/en 아래면 영어) */
export function useLang(): { lang: Lang; t: (ko: string, en: string) => string } {
  const lang = langOf(usePathname());
  return { lang, t: pick(lang) };
}
