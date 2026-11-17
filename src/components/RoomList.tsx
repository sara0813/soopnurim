"use client";
import { useState } from "react";
import { ChevronDown, ExternalLink } from "lucide-react";
import type { Room } from "@/lib/types";
import { useLang } from "@/lib/useLang";

const LOT: Record<string, string> = { disabled: "장애인 추첨", multiChild: "다자녀 추첨", voucher: "바우처 우선" };
const LOT_EN: Record<string, string> = { disabled: "Disabled lottery", multiChild: "Large-family lottery", voucher: "Voucher priority" };

type Filter = "all" | "disabled" | "multiChild" | "noLoft";

export default function RoomList({ rooms }: { rooms: Room[] }) {
  const { lang, t } = useLang();
  const en = lang === "en";
  const won = (n: number | null) => (n ? (en ? `KRW ${n.toLocaleString()}` : `${n.toLocaleString()}원`) : "–");
  const [filter, setFilter] = useState<Filter>("all");
  const [limit, setLimit] = useState(8);
  const isDisabled = (r: Room) => r.lottery.includes("disabled") || r.disabledPriority;
  const shown = rooms.filter((r) =>
    filter === "all" ? true : filter === "noLoft" ? !r.loft : filter === "disabled" ? isDisabled(r) : r.lottery.includes(filter),
  );
  const opts: [Filter, string][] = [
    ["all", t(`전체 ${rooms.length}`, `All ${rooms.length}`)],
    ["disabled", t(`장애인 추첨·우선 ${rooms.filter(isDisabled).length}`, `Disabled lottery/priority ${rooms.filter(isDisabled).length}`)],
    ["multiChild", t(`다자녀 추첨 ${rooms.filter((r) => r.lottery.includes("multiChild")).length}`, `Large-family lottery ${rooms.filter((r) => r.lottery.includes("multiChild")).length}`)],
    ["noLoft", t(`다락·복층 언급 없음 ${rooms.filter((r) => !r.loft).length}`, `No loft mentioned ${rooms.filter((r) => !r.loft).length}`)],
  ];
  return (
    <div className="space-y-3">
      <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="group" aria-label={t("객실 필터", "Room filter")}>
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
                {r.capacity ? t(` · 기준 ${r.capacity}명`, ` · ${r.capacity} guests`) : ""}
              </span>
            </div>
            <p className="mt-0.5 text-sm tabular-nums">
              {t("비수기 주중", "Off-season weekday")} {won(r.priceOffWeekday)} · {t("성수기 주말", "Peak weekend")} {won(r.pricePeakWeekend)}
            </p>
            {(r.lottery.length > 0 || r.disabledPriority || r.bed || r.ondol || r.loft) && (
              <div className="mt-2 flex flex-wrap gap-1">
                {r.lottery.map((k) => (
                  <span key={k} className="tag tag-brand">
                    {(en ? LOT_EN : LOT)[k] ?? k}
                  </span>
                ))}
                {r.disabledPriority && <span className="tag tag-brand">{t("장애인 우선예약 표기", "Marked disabled priority")}</span>}
                {r.bed && <span className="tag">{t("침대 언급", "Bed mentioned")}</span>}
                {r.ondol && <span className="tag">{t("온돌 언급", "Ondol (floor) mentioned")}</span>}
                {r.loft && <span className="tag tag-warn">{t("다락·복층·계단 언급", "Loft or stairs mentioned")}</span>}
              </div>
            )}
            <div className="mt-1 flex flex-wrap items-center gap-x-3 text-sm">
              {r.layoutImg && (
                <a href={r.layoutImg} target="_blank" rel="noreferrer" className="inline-flex min-h-9 items-center gap-1 font-medium text-brand-strong underline underline-offset-2">
                  {t("객실 위치도", "Room location map")} <ExternalLink aria-hidden="true" className="size-3.5" />
                </a>
              )}
              {r.desc && (
                <details className="w-full">
                  <summary className="inline-flex min-h-9 cursor-pointer items-center gap-1 font-medium text-muted">
                    {t("객실 설명 원문", "Room description (Korean original)")} <ChevronDown aria-hidden="true" className="chev size-4" />
                  </summary>
                  <p lang="ko" className="text-muted">
                    {r.desc}
                  </p>
                </details>
              )}
            </div>
          </li>
        ))}
      </ul>
      {shown.length > limit && (
        <button type="button" className="btn btn-outline w-full" onClick={() => setLimit((l) => l + 16)}>
          {t(`객실 더 보기 (${shown.length - limit}실 남음)`, `Show more rooms (${shown.length - limit} left)`)}
        </button>
      )}
      {shown.length === 0 && <p className="text-muted">{t("조건에 맞는 객실이 없습니다.", "No rooms match.")}</p>}
    </div>
  );
}
