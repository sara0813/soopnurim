import type { Metadata } from "next";
import stats from "@/data/stats.json";
import { FORESTS, buildJourney } from "@/lib/journey";
import { GROUPS } from "@/lib/groups";

export const metadata: Metadata = { title: "전국 정보 빈칸 통계" };

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
  const gl = (g: string) => GROUPS.find((x) => x.id === g)!.emoji;

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-extrabold">전국 정보 빈칸 통계</h1>
        <p className="text-muted">
          숲누림이 산림공공데이터 {stats.datasetsUsed}종을 결합해 전국 {stats.forestTotal}곳을 분석한 결과, 보행약자의 여정
          판단에 필요한 {rows.length}개 항목 중 <strong>{fullyBlank}개 항목은 전국 어디에도 공공데이터가 없습니다.</strong>
        </p>
      </header>

      <section aria-labelledby="key-h" className="grid gap-3 sm:grid-cols-3">
        <h2 id="key-h" className="sr-only">
          핵심 수치
        </h2>
        <div className="card p-4">
          <p className="text-sm font-bold text-muted">표준데이터에 없는 국립자연휴양림</p>
          <p className="text-3xl font-extrabold">
            {stats.nationalNotInStd}
            <span className="text-lg"> / {stats.nationalForests}곳</span>
          </p>
        </div>
        <div className="card p-4">
          <p className="text-sm font-bold text-muted">표준데이터 중복 등록</p>
          <p className="text-3xl font-extrabold">
            {stats.stdDuplicates}
            <span className="text-lg">건 / {stats.stdRows}건</span>
          </p>
        </div>
        <div className="card p-4">
          <p className="text-sm font-bold text-muted">무장애나눔길이 0.5km 안에 연결된 휴양림</p>
          <p className="text-3xl font-extrabold">
            {stats.nanumMatch["0.5km 이내"] ?? 0}
            <span className="text-lg"> / {stats.forestTotal}곳</span>
          </p>
        </div>
      </section>

      <section aria-labelledby="item-h" className="card overflow-x-auto p-4">
        <h2 id="item-h" className="mb-3 text-xl font-extrabold">
          항목별 빈칸 비율 (빈칸이 많은 순)
        </h2>
        <table className="w-full min-w-[520px] text-left">
          <thead>
            <tr className="border-b-2 border-line">
              <th scope="col" className="py-2">항목</th>
              <th scope="col">대상</th>
              <th scope="col" className="w-1/2">빈칸 비율</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const pct = Math.round((r.blank / r.total) * 100);
              return (
                <tr key={r.label} className="border-b border-line">
                  <th scope="row" className="py-2 font-semibold">
                    {r.step}. {r.label}
                  </th>
                  <td aria-label={r.groups.join(",")}>{r.groups.map(gl).join(" ")}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="h-3 flex-1 overflow-hidden rounded-full bg-[var(--src-public-bg)]">
                        <div className="h-full bg-[var(--src-blank)]" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="w-28 text-right text-sm font-bold">
                        {pct}% ({r.blank}/{r.total})
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section aria-labelledby="room-h" className="card p-4">
        <h2 id="room-h" className="mb-1 text-xl font-extrabold">
          국립자연휴양림 객실 설명에서 찾은 키워드
        </h2>
        <p className="mb-3 text-sm text-muted">
          국립자연휴양림 시설관련 정보의 숙박 객실 {stats.roomKeywordStats[0].total}실 &lsquo;상품설명&rsquo;(자유서술) 텍스트 분석
        </p>
        <ul className="space-y-2">
          {stats.roomKeywordStats.map((k) => (
            <li key={k.label} className="grid grid-cols-[9rem_1fr_5rem] items-center gap-2">
              <span className="font-semibold">{k.label}</span>
              <div className="h-3 overflow-hidden rounded-full bg-[var(--src-blank-bg)]">
                <div className="h-full bg-[var(--src-public)]" style={{ width: `${(k.count / k.total) * 100}%` }} />
              </div>
              <span className="text-right text-sm font-bold">{k.count}실</span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="log-h" className="card overflow-x-auto p-4">
        <h2 id="log-h" className="mb-3 text-xl font-extrabold">
          데이터 개선 의견 로그
        </h2>
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b-2 border-line">
              <th scope="col" className="py-2">데이터셋</th>
              <th scope="col">문제</th>
              <th scope="col">이용자 영향</th>
              <th scope="col">개선 제안</th>
            </tr>
          </thead>
          <tbody>
            {stats.improveLog.map((l, i) => (
              <tr key={i} className="border-b border-line align-top">
                <td className="py-2 pr-2 font-semibold">{l.dataset}</td>
                <td className="pr-2">{l.problem}</td>
                <td className="pr-2">{l.impact}</td>
                <td>{l.proposal}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
