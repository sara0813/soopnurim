import { Accessibility, Baby, Languages, PersonStanding } from "lucide-react";
import type { Group } from "@/lib/types";

export const GROUP_ICON: Record<Group, typeof Accessibility> = {
  wheelchair: Accessibility,
  elder: PersonStanding,
  child: Baby,
  foreign: Languages,
};

/** 숲누림 로고 마크 (나무 + 길) */
/** 숲누림 로고 (나무와 웃는 땅). 원본 그림: public/logo.svg, 앱 아이콘: public/icon.svg */
export function LogoMark({ className = "size-10" }: { className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/logo.svg" alt="" aria-hidden="true" width={40} height={48} className={`${className} object-contain`} />;
}
