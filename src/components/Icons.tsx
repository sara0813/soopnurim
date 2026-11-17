import { Accessibility, Baby, PersonStanding } from "lucide-react";
import type { Group } from "@/lib/types";

export const GROUP_ICON: Record<Group, typeof Accessibility> = {
  wheelchair: Accessibility,
  elder: PersonStanding,
  child: Baby,
};

/** 숲누림 로고 마크 (나무 + 길) */
export function LogoMark({ className = "size-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="#5645d4" />
      <path d="M16 5 9.5 15h3.6L8.5 22h15l-4.6-7h3.6z" fill="#fff" />
      <path d="M14.6 22h2.8v4.5h-2.8z" fill="#e6e0f5" />
    </svg>
  );
}
