"use client";
import { Check } from "lucide-react";
import { GROUPS } from "@/lib/groups";
import { useGroups } from "@/lib/useGroups";
import { GROUP_ICON } from "./Icons";

export default function GroupPicker({ compact = false }: { compact?: boolean }) {
  const { groups, toggle } = useGroups();
  return (
    <fieldset>
      <legend className={compact ? "mb-2 text-sm font-semibold text-muted" : "mb-3 text-lg font-bold"}>
        누구와 함께 가나요? <span className="font-normal text-muted">(여러 개 선택 가능)</span>
      </legend>
      <div className="grid grid-cols-3 gap-2">
        {GROUPS.map((g) => {
          const on = groups.includes(g.id);
          const Icon = GROUP_ICON[g.id];
          return (
            <button
              key={g.id}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(g.id)}
              className={`relative flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-xl border px-2 py-2.5 text-center transition-colors sm:flex-row sm:justify-start sm:gap-3 sm:px-3.5 sm:text-left ${
                on
                  ? "border-brand-strong bg-brand-soft text-brand-strong"
                  : "border-line-strong bg-surface hover:bg-surface-2"
              }`}
            >
              <span
                aria-hidden="true"
                className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${
                  on ? "bg-brand-strong text-white" : "bg-surface-2 text-muted"
                }`}
              >
                <Icon className="size-5" strokeWidth={2} />
              </span>
              <span className="flex flex-col">
                <span className="text-[0.92rem] font-semibold leading-tight sm:text-base">
                  {g.label}
                  {on && <span className="sr-only"> (선택됨)</span>}
                </span>
                {!compact && <span className="hidden text-xs text-muted sm:block">{g.desc}</span>}
              </span>
              {on && (
                <Check aria-hidden="true" className="absolute right-2 top-2 size-4 sm:static sm:ml-auto" strokeWidth={3} />
              )}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
