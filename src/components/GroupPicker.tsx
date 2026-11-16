"use client";
import { GROUPS } from "@/lib/groups";
import { useGroups } from "@/lib/useGroups";

export default function GroupPicker({ compact = false }: { compact?: boolean }) {
  const { groups, toggle } = useGroups();
  return (
    <fieldset>
      <legend className={compact ? "mb-2 text-base font-bold" : "mb-3 text-2xl font-extrabold"}>
        누구와 가나요? <span className="text-base font-normal text-muted">(여러 개 선택 가능)</span>
      </legend>
      <div className="grid gap-2 sm:grid-cols-3">
        {GROUPS.map((g) => {
          const on = groups.includes(g.id);
          return (
            <button
              key={g.id}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(g.id)}
              className="btn btn-outline h-auto justify-start py-3 text-left"
            >
              <span aria-hidden="true" className="text-3xl">
                {g.emoji}
              </span>
              <span className="flex flex-col">
                <span className="text-lg">
                  {g.label} {on && <span className="sr-only">(선택됨)</span>}
                </span>
                {!compact && <span className="text-sm font-normal text-muted">{g.desc}</span>}
              </span>
              <span aria-hidden="true" className="ml-auto text-xl">
                {on ? "✔" : ""}
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
