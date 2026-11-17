import type { Metadata } from "next";
import stats from "@/data/stats.json";
import { FORESTS, SOURCES, buildJourney } from "@/lib/journey";

export const metadata: Metadata = { title: "전국 정보 빈칸 통계" };

const SHORT: Record<string, string> = { wheelchair: "휠체어", elder: "고령자", child: "유아" };

export default function GapsPage() {
  const all = FORESTS.map(buildJourney);
  const byKey = new Map<string, { label: string; step: number; groups: string[]; total: number; blank: number }>();
  for (const items of all) {
    for (const it of items) {
      const e = byKey.get(it.key) ?? { label: it.label, step: it.step, groups: it.groups, total: 0, blank: 0 };
      e.total++;
      if (it.status === "unknown") e.blank++;
      byKey.set(it.key, e);
    }
  }
  const rows = [...byKey.values()].sort((a, b) => b.blank / b.total - a.blank / a.total);
  const fullyBlank = rows.filter((r) => r.blank === r.total).length;
  const datasets = Object.keys(SOURCES).length;

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="eyebrow">전국 빈칸</p>
        <h1 className="text-[1.7rem] font-bold sm:text-3xl">전국 정보 빈칸 통계</h1>
        <p className="max-w-2xl text-muted">
          공공데이터 {datasets}종을 결합해 전국 휴양림 {stats.forestTotal}곳을 분석했습니다. 보행약자의 여정 판단에 필요한{" "}
          {rows.length}개 항목 중 <strong className="text-fg">{fullyBlank}개 항목은 전국 어디에도 공공데이터가 없습니다.</strong>
        </p>
      </header>

      <section aria-labelledby="key-h" className="grid gap-2 sm:grid-cols-3">
        <h2 id="key-h" className="sr-only">
          핵심 수치
        </h2>
        {[
          ["표준데이터에 없는 국립자연휴양림", `${stats.nationalNotInStd}`, ` / ${stats.nationalForests}곳`],
          ["표준데이터 중복 등록", `${stats.stdDuplicates}`, `건 / ${stats.stdRows}건`],
          ["무장애나눔길이 0.5km 안에 있는 휴양림", `${(stats.nanumMatch as Record<string, number>)["0.5km 이내"] ?? 0}`, ` / ${stats.forestTotal}곳`],
        ].map(([k, v, u]) => (
          <div key={k} className="card p-4">
            <p className="text-xs font-medium text-muted">{k}</p>
            <p className="mt-0.5 text-2xl font-bold tabular-nums">
              {v}
              <span className="text-base font-semibold text-muted">{u}</span>
            </p>
          </div>
        ))}
      </section>

      <section aria-labelledby="item-h" className="card p-4 sm:p-5">
        <h2 id="item-h" className="mb-1 text-xl font-bold">
          항목별 빈칸 비율
        </h2>
        <p className="mb-4 text-sm text-muted">빈칸이 많은 순. 막대가 길수록 공공데이터로 확인할 수 없는 휴양림이 많습니다.</p>
        <ul className="space-y-3">
          {rows.map((r) => {
            const pct = Math.round((r.blank / r.total) * 100);
            return (
              <li key={r.label}>
                <div className="flex flex-wrap items-baseline justify-between gap-x-2 text-sm">
                  <span className="font-semibold">
                    <span className="text-muted">{r.step}.</span> {r.label}
                    <span className="ml-2 text-xs font-normal text-muted">{r.groups.map((g) => SHORT[g]).join(" · ")}</span>
                  </span>
                  <span className="tabular-nums text-muted">
                    <strong className="text-fg">{pct}%</strong> ({r.blank}/{r.total})
                  </span>
                </div>
                <div
                  className="mt-1 h-2 overflow-hidden rounded-full bg-[var(--brand-soft)]"
                  role="img"
                  aria-label={`빈칸 ${pct}퍼센트`}
                >
                  <div className="h-full rounded-full bg-[var(--blank)]" style={{ width: `${pct}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="room-h" className="card p-4 sm:p-5">
        <h2 id="room-h" className="mb-1 text-xl font-bold">
          국립자연휴양림 객실 설명에서 찾은 키워드
        </h2>
        <p className="mb-4 text-sm text-muted">
          숙박 객실 {stats.roomKeywordStats[0].total.toLocaleString()}실의 &lsquo;상품설명&rsquo;(자유서술) 텍스트 분석
        </p>
        <ul className="space-y-2.5">
          {stats.roomKeywordStats.map((k) => (
            <li key={k.label} className="grid grid-cols-[8.5rem_1fr_3.5rem] items-center gap-3 text-sm">
              <span className="font-medium">{k.label}</span>
              <div className="h-2 overflow-hidden rounded-full bg-[var(--blank-bg)]">
                <div className="h-full rounded-full bg-[var(--brand)]" style={{ width: `${(k.count / k.total) * 100}%` }} />
              </div>
              <span className="text-right font-semibold tabular-nums">{k.count}실</span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="log-h" className="space-y-3">
        <div>
          <h2 id="log-h" className="text-xl font-bold">
            데이터 개선 의견
          </h2>
          <p className="text-sm text-muted">결합 과정에서 발견한 문제와 이용자 영향, 개선 제안 ({stats.improveLog.length}건)</p>
        </div>
        <ol className="space-y-2">
          {stats.improveLog.map((l, i) => (
            <li key={i} className="card p-4">
              <p className="text-xs font-semibold text-brand-strong">{l.dataset}</p>
              <p className="mt-1 font-semibold">{l.problem}</p>
              <dl className="mt-2 grid gap-1 text-sm sm:grid-cols-2 sm:gap-4">
                <div>
                  <dt className="text-xs text-muted">이용자 영향</dt>
                  <dd>{l.impact}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">개선 제안</dt>
                  <dd>{l.proposal}</dd>
                </div>
              </dl>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
