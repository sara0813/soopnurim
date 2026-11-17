"use client";
import { useState } from "react";
import { ChevronDown, ExternalLink } from "lucide-react";
import type { Room } from "@/lib/types";

const won = (n: number | null) => (n ? `${n.toLocaleString()}원` : "–");
const LOT: Record<string, string> = { disabled: "장애인 추첨", multiChild: "다자녀 추첨", voucher: "바우처 우선" };

type Filter = "all" | "disabled" | "multiChild" | "noLoft";

export default function RoomList({ rooms }: { rooms: Room[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [limit, setLimit] = useState(8);
  const isDisabled = (r: Room) => r.lottery.includes("disabled") || r.disabledPriority;
  const shown = rooms.filter((r) =>
    filter === "all" ? true : filter === "noLoft" ? !r.loft : filter === "disabled" ? isDisabled(r) : r.lottery.includes(filter),
  );
  const opts: [Filter, string][] = [
    ["all", `전체 ${rooms.length}`],
    ["disabled", `장애인 추첨·우선 ${rooms.filter(isDisabled).length}`],
    ["multiChild", `다자녀 추첨 ${rooms.filter((r) => r.lottery.includes("multiChild")).length}`],
    ["noLoft", `다락·복층 언급 없음 ${rooms.filter((r) => !r.loft).length}`],
  ];
  return (
    <div className="space-y-3">
      <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="group" aria-label="객실 필터">
        {opts.map(([v, l]) => (
          <button
            key={v}
            type="button"
            className="chip"
            aria-pressed={filter === v}
            onClick={() => {
              setFilter(v);
              setLimit(8);
            }}
          >
            {l}
          </button>
        ))}
      </div>
      <ul className="grid gap-2 sm:grid-cols-2">
        {shown.slice(0, limit).map((r) => (
          <li key={r.name} className="rounded-xl border border-line bg-surface-2 p-3">
            <div className="flex flex-wrap items-baseline justify-between gap-x-2">
              <strong className="font-semibold">{r.name}</strong>
              <span className="text-sm text-muted">
                {r.areaM2 ? `${r.areaM2}㎡` : ""}
                {r.capacity ? ` · 기준 ${r.capacity}명` : ""}
              </span>
            </div>
            <p className="mt-0.5 text-sm tabular-nums">
              비수기 주중 {won(r.priceOffWeekday)} · 성수기 주말 {won(r.pricePeakWeekend)}
            </p>
            {(r.lottery.length > 0 || r.disabledPriority || r.bed || r.ondol || r.loft) && (
              <div className="mt-2 flex flex-wrap gap-1">
                {r.lottery.map((t) => (
                  <span key={t} className="tag tag-brand">
                    {LOT[t] ?? t}
                  </span>
                ))}
                {r.disabledPriority && <span className="tag tag-brand">장애인 우선예약 표기</span>}
                {r.bed && <span className="tag">침대 언급</span>}
                {r.ondol && <span className="tag">온돌 언급</span>}
                {r.loft && <span className="tag tag-warn">다락·복층·계단 언급</span>}
              </div>
            )}
            <div className="mt-1 flex flex-wrap items-center gap-x-3 text-sm">
              {r.layoutImg && (
                <a href={r.layoutImg} target="_blank" rel="noreferrer" className="inline-flex min-h-9 items-center gap-1 font-medium text-brand-strong underline underline-offset-2">
                  객실 위치도 <ExternalLink aria-hidden="true" className="size-3.5" />
                </a>
              )}
              {r.desc && (
                <details className="w-full">
                  <summary className="inline-flex min-h-9 cursor-pointer items-center gap-1 font-medium text-muted">
                    객실 설명 원문 <ChevronDown aria-hidden="true" className="chev size-4" />
                  </summary>
                  <p className="text-muted">{r.desc}</p>
                </details>
              )}
            </div>
          </li>
        ))}
      </ul>
      {shown.length > limit && (
        <button type="button" className="btn btn-outline w-full" onClick={() => setLimit((l) => l + 16)}>
          객실 더 보기 ({shown.length - limit}실 남음)
        </button>
      )}
      {shown.length === 0 && <p className="text-muted">조건에 맞는 객실이 없습니다.</p>}
    </div>
  );
}
