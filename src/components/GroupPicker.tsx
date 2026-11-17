"use client";
import { Check } from "lucide-react";
import { GROUPS } from "@/lib/groups";
import type { Group } from "@/lib/types";
import { useGroups } from "@/lib/useGroups";
import { useLang } from "@/lib/useLang";
import { GROUP_ICON } from "./Icons";

/**
 * 이용자 유형 선택.
 * 휠체어·고령자·유아 동반은 '누구와 가는지'(시설 접근성)를 고르는 것이고,
 * 외국인 여행자는 예약·교통·언어 정보를 더 보는 것이라 성격이 달라 따로 켜고 끄게 나눴다.
 * 상태는 같은 groups 배열 하나라 필터·여정·질문 계산은 그대로다.
 */
export default function GroupPicker({ compact = false }: { compact?: boolean }) {
  const { groups, toggle } = useGroups();
  const { lang, t } = useLang();
  const access = GROUPS.filter((g) => g.id !== "foreign");
  const foreign = GROUPS.find((g) => g.id === "foreign");
  const fOn = groups.includes("foreign");
  const FIcon = GROUP_ICON.foreign;

  const Btn = ({ id, label }: { id: Group; label: string }) => {
    const on = groups.includes(id);
    const Icon = GROUP_ICON[id];
    return (
      <button
        type="button"
        aria-pressed={on}
        onClick={() => toggle(id)}
        className={`relative flex min-h-[56px] items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-colors ${
          on ? "border-brand-strong bg-brand-soft text-brand-strong" : "border-line-strong bg-surface hover:bg-surface-2"
        }`}
      >
        <span
          aria-hidden="true"
          className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${on ? "bg-brand-fill text-white" : "bg-surface-2 text-muted"}`}
        >
          <Icon className="size-[18px]" strokeWidth={2} />
        </span>
        <span className="min-w-0 pr-4 text-[0.9rem] font-semibold leading-tight">
          {label}
          {on && <span className="sr-only"> {t("(선택됨)", "(selected)")}</span>}
        </span>
        {on && <Check aria-hidden="true" className="absolute right-2 top-2 size-3.5" strokeWidth={3} />}
      </button>
    );
  };

  return (
    <div className="space-y-2.5">
      <fieldset>
        <legend className={compact ? "mb-2 text-sm font-semibold text-muted" : "mb-3 text-lg font-bold"}>
          {t("누구와 함께 가나요?", "Who is traveling?")}{" "}
          <span className="font-normal text-muted">{t("(중복 선택 가능)", "(choose any)")}</span>
        </legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {access.map((g) => (
            <Btn key={g.id} id={g.id} label={lang === "en" ? g.label_en : g.label} />
          ))}
        </div>
      </fieldset>
      {foreign && (
        <button
          type="button"
          role="switch"
          aria-checked={fOn}
          onClick={() => toggle("foreign")}
          className={`flex w-full min-h-12 items-center gap-3 rounded-xl border px-3 py-2 text-left transition-colors ${
            fOn ? "border-brand-strong bg-brand-soft" : "border-line bg-surface hover:bg-surface-2"
          }`}
        >
          <FIcon aria-hidden="true" className={`size-[18px] shrink-0 ${fOn ? "text-brand-strong" : "text-muted"}`} strokeWidth={2} />
          <span className="min-w-0 flex-1 leading-tight">
            <span className={`block text-[0.9rem] font-semibold ${fOn ? "text-brand-strong" : ""}`}>
              {t("외국인 여행자", "Visiting from abroad")}
            </span>
            <span className="block text-xs text-muted">
              {lang === "en" ? foreign.desc_en : foreign.desc}
            </span>
          </span>
          <span
            aria-hidden="true"
            className={`relative h-6 w-10 shrink-0 rounded-full transition-colors ${fOn ? "bg-brand-fill" : "bg-line-strong"}`}
          >
            <span className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${fOn ? "left-[18px]" : "left-0.5"}`} />
          </span>
        </button>
      )}
    </div>
  );
}
