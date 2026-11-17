"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "숲 찾기", short: "숲 찾기" },
  { href: "/gaps", label: "전국 빈칸", short: "빈칸" },
  { href: "/data", label: "데이터 출처", short: "출처" },
  { href: "/about", label: "소개", short: "소개" },
];

export default function NavLinks() {
  const path = usePathname();
  return (
    <ul className="no-scrollbar -mr-2 flex min-w-0 gap-0.5 overflow-x-auto overflow-y-hidden whitespace-nowrap text-[0.9rem] font-semibold">
      {LINKS.map((l) => {
        const on = l.href === "/" ? path === "/" || path.startsWith("/forest") : path.startsWith(l.href);
        return (
          <li key={l.href}>
            <Link
              href={l.href}
              aria-current={on ? "page" : undefined}
              className={`relative inline-flex min-h-14 items-center px-1.5 sm:px-2.5 ${
                on ? "text-brand-strong" : "text-muted hover:text-fg"
              }`}
            >
              <span className="sm:hidden">{l.short}</span>
              <span className="hidden sm:inline">{l.label}</span>
              {on && <span aria-hidden="true" className="absolute inset-x-1.5 bottom-0 sm:inset-x-2.5 h-0.5 rounded bg-brand-strong" />}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
