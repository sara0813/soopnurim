import { ChevronDown } from "lucide-react";
import { SOURCES, sourceName } from "@/lib/journey";
import type { Lang } from "@/lib/i18n";

/** 접이식 카드: 제목과 한 줄 요약만 보이고, 누르면 내용이 펼쳐진다 */
export function Fold({
  id,
  title,
  meta,
  open = false,
  children,
}: {
  id: string;
  title: string;
  meta?: string;
  open?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details id={id} open={open} className="card scroll-mt-4 overflow-hidden">
      <summary className="flex min-h-16 cursor-pointer items-center gap-3 px-4 py-3 hover:bg-surface-2 sm:px-5">
        <span className="min-w-0 flex-1">
          <h2 id={`${id}-h`} className="text-lg font-bold leading-snug">
            {title}
          </h2>
          {meta && <span className="mt-0.5 block text-sm text-muted">{meta}</span>}
        </span>
        <ChevronDown aria-hidden="true" className="chev size-5 shrink-0 text-muted" />
      </summary>
      <div className="border-t border-line px-4 py-4 sm:px-5">{children}</div>
    </details>
  );
}

export function Section({
  id,
  title,
  desc,
  children,
  plain = false,
}: {
  id: string;
  title: string;
  desc?: string;
  children: React.ReactNode;
  plain?: boolean;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className={`scroll-mt-20 ${plain ? "" : "card p-4 sm:p-5"}`}>
      <header className="mb-3">
        <h2 id={`${id}-h`} className="text-xl font-bold">
          {title}
        </h2>
        {desc && <p className="mt-0.5 text-sm text-muted">{desc}</p>}
      </header>
      {children}
    </section>
  );
}

export function Sub({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-line pt-4 first:border-t-0 first:pt-0">
      <h3 className="mb-2 font-semibold">{title}</h3>
      {children}
    </div>
  );
}

/** 출처 한 줄: 데이터셋명(링크) · 기준일 */
export function Src({ k, date, note, lang = "ko" }: { k: string; date?: string; note?: string; lang?: Lang }) {
  const s = SOURCES[k];
  if (!s) return null;
  const d = date ?? s.refDate;
  return (
    <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
      <span className="src src-public">
        {s.notPortal ? (lang === "en" ? "Official list" : "기관 공식 목록") : lang === "en" ? "Public data" : "공공데이터"}
      </span>
      <a href={s.url} target="_blank" rel="noreferrer" className="underline underline-offset-2">
        {sourceName(s, lang)}
      </a>
      {d && (
        <span>
          · {lang === "en" ? "as of" : "기준일"} {d}
        </span>
      )}
      {note && <span>· {note}</span>}
    </p>
  );
}

export function Note({ children }: { children: React.ReactNode }) {
  return <p className="mt-1 text-xs text-muted">{children}</p>;
}
