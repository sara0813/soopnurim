"use client";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, MapPinned } from "lucide-react";
import { useLang } from "@/lib/useLang";

/** 지도 앱 선택: 네이버 지도 / 카카오맵. 휴대폰에서는 각 웹 지도가 설치된 앱으로 이어 준다. */
export default function MapAppMenu({ name, lat, lng }: { name: string; lat: number; lng: number }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const q = name.replace(/\(.*?\)/g, "").trim();
  const { lang, t } = useLang();
  // 한국 지도 앱은 한글 이름으로 검색해야 정확하다. 영어 화면에는 Google 지도도 함께 둔다(대중교통 길찾기용)
  const apps = [
    { label: t("네이버 지도", "Naver Map"), href: `https://map.naver.com/p/search/${encodeURIComponent(q)}` },
    { label: t("카카오맵", "KakaoMap"), href: `https://map.kakao.com/link/map/${encodeURIComponent(q)},${lat},${lng}` },
    ...(lang === "en" ? [{ label: "Google Maps", href: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}` }] : []),
  ];

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button type="button" className="btn btn-outline" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <MapPinned aria-hidden="true" className="size-4" /> {t("지도 앱", "Open in map")}
        <ChevronDown aria-hidden="true" className={`size-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <ul className="absolute left-0 top-full z-[1200] mt-1 min-w-full overflow-hidden rounded-lg border border-line bg-surface py-1 shadow-[0_16px_48px_-8px_rgb(15_15_15/0.16)]">
          {apps.map((a) => (
            <li key={a.label}>
              <a
                href={a.href}
                target="_blank"
                rel="noreferrer"
                className="flex min-h-11 items-center whitespace-nowrap px-4 font-semibold hover:bg-surface-2"
                onClick={() => setOpen(false)}
              >
                {a.label}
                <span className="sr-only">{t("(새 창)", "(new window)")}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
