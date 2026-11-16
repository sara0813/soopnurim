export default function CoverageBar({ known, total, size = "md" }: { known: number; total: number; size?: "md" | "lg" }) {
  const pct = total ? Math.round((known / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className={size === "lg" ? "text-lg font-bold" : "text-sm font-bold"}>
          정보 확인도{" "}
          <span className="font-normal text-muted">
            (필요 정보 {total}개 중 {known}개 확인)
          </span>
        </span>
        <span className={size === "lg" ? "text-2xl font-extrabold" : "font-extrabold"}>{pct}%</span>
      </div>
      <div
        role="meter"
        aria-label="정보 확인도"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-valuetext={`필요 정보 ${total}개 중 ${known}개 확인, ${pct}퍼센트`}
        className={`mt-1 w-full overflow-hidden rounded-full bg-[var(--src-blank-bg)] ${size === "lg" ? "h-4" : "h-2.5"}`}
      >
        <div className="h-full rounded-full bg-[var(--src-public)]" style={{ width: `${pct}%` }} />
      </div>
      {size === "lg" && (
        <p className="mt-1 text-sm text-muted">
          ※ 접근성 점수가 아닙니다. 여행 판단에 필요한 정보 중 <strong>출처가 있는 정보가 얼마나 채워졌는지</strong>를
          나타냅니다.
        </p>
      )}
    </div>
  );
}
