import { SOURCES } from "@/lib/journey";

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
export function Src({ k, date, note }: { k: string; date?: string; note?: string }) {
  const s = SOURCES[k];
  if (!s) return null;
  const d = date ?? s.refDate;
  return (
    <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
      <span className="src src-public">공공데이터</span>
      <a href={s.url} target="_blank" rel="noreferrer" className="underline underline-offset-2">
        {s.name}
      </a>
      {d && <span>· 기준일 {d}</span>}
      {note && <span>· {note}</span>}
    </p>
  );
}

export function Note({ children }: { children: React.ReactNode }) {
  return <p className="mt-1 text-xs text-muted">{children}</p>;
}
