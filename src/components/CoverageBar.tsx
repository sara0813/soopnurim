"use client";
import { useLang } from "@/lib/useLang";

/**
 * 정보 확인도: 필요한 항목 중 출처 있는 정보가 있는 항목 수. 접근성·추천 점수로 읽히지 않도록
 * 항목 수(8/15)를 먼저, 비율은 보조로 보여 준다.
 */
export default function CoverageBar({ known, total, size = "md" }: { known: number; total: number; size?: "md" | "lg" }) {
  const { t } = useLang();
  const pct = total ? Math.round((known / total) * 100) : 0;
  const lg = size === "lg";
  const label = t("정보 확인도", "Info coverage");
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className={lg ? "font-semibold" : "text-xs font-semibold text-muted"}>{label}</span>
        <span className={`shrink-0 whitespace-nowrap tabular-nums ${lg ? "text-lg" : "text-sm"}`}>
          <strong className="font-bold">{known}</strong>
          <span className="text-muted">
            /{total}
            {t("항목", " items")}
          </span>
        </span>
      </div>
      <div
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={known}
        aria-valuetext={t(`필요한 ${total}개 항목 중 ${known}개에 확인 가능한 정보가 있음`, `${known} of ${total} needed items have sourced information`)}
        className={`mt-1.5 w-full overflow-hidden rounded-full bg-[var(--blank-bg)] ${lg ? "h-2.5" : "h-1.5"}`}
      >
        <div className="h-full rounded-full bg-[var(--brand)]" style={{ width: `${pct}%` }} />
      </div>
      {lg && (
        <p className="mt-2 text-sm text-muted">
          {t(
            `필요한 ${total}개 항목 중 ${known}개에 확인 가능한 정보가 있어요. 정보가 많다는 뜻이지, 시설이 더 안전하거나 이용하기 좋다는 뜻은 아니에요.`,
            `${known} of the ${total} items you need have sourced information. More information does not mean the forest is safer or easier to use.`,
          )}
        </p>
      )}
    </div>
  );
}
