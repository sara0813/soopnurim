"use client";
import { Check } from "lucide-react";
import { GROUPS } from "@/lib/groups";
import { useGroups } from "@/lib/useGroups";
import { useLang } from "@/lib/useLang";
import { GROUP_ICON } from "./Icons";

export default function GroupPicker({ compact = false }: { compact?: boolean }) {
  const { groups, toggle } = useGroups();
  const { lang, t } = useLang();
  return (
    <fieldset>
      <legend className={compact ? "mb-2 text-sm font-semibold text-muted" : "mb-3 text-lg font-bold"}>
        {t("누구와 함께 가나요?", "Who is traveling?")}{" "}
        <span className="font-normal text-muted">{t("(중복 선택 가능)", "(choose any)")}</span>
      </legend>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {GROUPS.map((g) => {
          const on = groups.includes(g.id);
          const Icon = GROUP_ICON[g.id];
          const label = lang === "en" ? g.label_en : g.label;
          return (
            <button
              key={g.id}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(g.id)}
              className={`relative flex min-h-[56px] items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-colors ${
                on ? "border-brand-strong bg-brand-soft text-brand-strong" : "border-line-strong bg-surface hover:bg-surface-2"
              }`}
            >
              <span
                aria-hidden="true"
                className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${
                  on ? "bg-brand-fill text-white" : "bg-surface-2 text-muted"
                }`}
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
        })}
      </div>
    </fieldset>
  );
}
