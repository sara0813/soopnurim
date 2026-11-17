"use client";
import { useEffect } from "react";

/** 주소의 #id가 접힌 카드(details) 안에 있으면 펼치고 그 위치로 이동한다 */
export default function OpenOnHash() {
  useEffect(() => {
    const open = () => {
      const id = decodeURIComponent(location.hash.slice(1));
      if (!id) return;
      const el = document.getElementById(id);
      if (!el) return;
      let p: HTMLElement | null = el;
      let changed = false;
      while (p) {
        if (p instanceof HTMLDetailsElement && !p.open) {
          p.open = true;
          changed = true;
        }
        p = p.parentElement;
      }
      if (changed) el.scrollIntoView({ block: "start" });
    };
    open();
    window.addEventListener("hashchange", open);
    // 같은 #id를 다시 누르면 hashchange가 일어나지 않으므로 직접 처리
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.('a[href^="#"]');
      if (a && a.getAttribute("href") === location.hash) open();
    };
    document.addEventListener("click", onClick);
    return () => {
      window.removeEventListener("hashchange", open);
      document.removeEventListener("click", onClick);
    };
  }, []);
  return null;
}
