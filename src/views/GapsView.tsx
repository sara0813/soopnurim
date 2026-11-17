import stats from "@/data/stats.json";
import { DATASET_COUNT, FORESTS, buildJourney } from "@/lib/journey";
import type { Lang } from "@/lib/i18n";
import type { Group } from "@/lib/types";

const SHORT: Record<Group, [string, string]> = {
  wheelchair: ["휠체어", "Wheelchair"],
  elder: ["고령자", "Older adults"],
  child: ["유아", "Young children"],
  foreign: ["외국인", "Foreign visitors"],
};

const KW_EN: Record<string, string> = {
  "장애인 우선예약/객실": "Disabled priority / room",
  침대: "Bed",
  온돌: "Ondol (floor heating)",
  "다락·복층·2층·계단": "Loft, duplex, stairs",
  "휠체어·경사로": "Wheelchair, ramp",
  엘리베이터: "Elevator",
  문턱: "Threshold",
  안전손잡이: "Grab bar",
  유모차: "Stroller",
  "기저귀·수유": "Diaper, nursing",
};

type Row = { key: string; label: string; step: number; groups: Group[]; total: number; blank: number };
type Log = { dataset: string; problem: string; impact: string; proposal: string } & Partial<
  Record<"dataset_en" | "problem_en" | "impact_en" | "proposal_en", string>
>;

export default function GapsView({ lang }: { lang: Lang }) {
  const en = lang === "en";
  const t = (ko: string, e: string) => (en ? e : ko);
  const byKey = new Map<string, Row>();
  for (const f of FORESTS) {
    for (const it of buildJourney(f, lang)) {
      const e = byKey.get(it.key) ?? { key: it.key, label: it.label, step: it.step, groups: it.groups, total: 0, blank: 0 };
      e.total++;
      if (it.status === "unknown") e.blank++;
      byKey.set(it.key, e);
    }
  }
  const sorted = [...byKey.values()].sort((a, b) => b.blank / b.total - a.blank / a.total);
  // 보행약자 항목(기존 통계 기준)과 외국인 여행자에게만 해당하는 항목을 나눠 보여 준다
  const foreignOnly = (r: Row) => r.groups.length === 1 && r.groups[0] === "foreign";
  const access = sorted.filter((r) => !foreignOnly(r));
  const foreign = sorted.filter(foreignOnly);
  const fullyBlank = access.filter((r) => r.blank === r.total).length;
  const foreignBlank = foreign.filter((r) => r.blank === r.total).length;
  const datasets = DATASET_COUNT;
  const nf = (n: number) => n.toLocaleString(en ? "en-US" : "ko-KR");

  const bars = (rows: Row[]) => (
    <ul className="space-y-3">
      {rows.map((r) => {
        const pct = r.total ? Math.round((r.blank / r.total) * 100) : 0;
        const tags = r.groups.length === 4 ? [t("모든 유형", "Everyone")] : r.groups.map((g) => SHORT[g][en ? 1 : 0]);
        return (
          <li key={r.key}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-2 text-sm">
              <span className="font-semibold">
                <span className="text-muted">{r.step}.</span> {r.label}
                <span className="ml-2 text-xs font-normal text-muted">{tags.join(" · ")}</span>
              </span>
              <span className="tabular-nums text-muted">
                <strong className="text-fg">{pct}%</strong> ({r.blank}/{r.total})
              </span>
            </div>
            <div
              className="mt-1 h-2 overflow-hidden rounded-full bg-[var(--brand-soft)]"
              role="img"
              aria-label={t(`빈칸 ${pct}퍼센트`, `${pct} percent blank`)}
            >
              <div className="h-full rounded-full bg-[var(--blank)]" style={{ width: `${pct}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );

  const cards: [string, string, string][] = en
    ? [
        ["National forests missing from the standard data", `${stats.nationalNotInStd}`, ` / ${stats.nationalForests}`],
        ["Duplicate records in the standard data", `${stats.stdDuplicates}`, ` / ${stats.stdRows}`],
        ["Forests with a barrier-free trail within 0.5 km", `${(stats.nanumMatch as Record<string, number>)["0.5km 이내"] ?? 0}`, ` / ${stats.forestTotal}`],
      ]
    : [
        ["표준데이터에 없는 국립자연휴양림", `${stats.nationalNotInStd}`, ` / ${stats.nationalForests}곳`],
        ["표준데이터 중복 등록", `${stats.stdDuplicates}`, `건 / ${stats.stdRows}건`],
        ["무장애나눔길이 0.5km 안에 있는 휴양림", `${(stats.nanumMatch as Record<string, number>)["0.5km 이내"] ?? 0}`, ` / ${stats.forestTotal}곳`],
      ];

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="eyebrow">{t("전국 빈칸", "Nationwide gaps")}</p>
        <h1 className="text-[1.7rem] font-bold sm:text-3xl">{t("전국 정보 빈칸 통계", "Information gaps across Korea")}</h1>
        {en ? (
          <p className="max-w-2xl text-muted">
            We combined {datasets} public datasets to analyse {stats.forestTotal} recreation forests. Of the {access.length}{" "}
            items people with limited mobility need to judge a trip,{" "}
            <strong className="text-fg">{fullyBlank} have no public data anywhere in the country.</strong> Of the{" "}
            {foreign.length} items only foreign visitors need, {foreignBlank} have none.
          </p>
        ) : (
          <p className="max-w-2xl text-muted">
            공공데이터 {datasets}종을 결합해 전국 휴양림 {stats.forestTotal}곳을 분석했습니다. 보행약자의 여정 판단에 필요한{" "}
            {access.length}개 항목 중 <strong className="text-fg">{fullyBlank}개 항목은 전국 어디에도 공공데이터가 없습니다.</strong>{" "}
            외국인 여행자에게만 필요한 {foreign.length}개 항목 중에서는 {foreignBlank}개가 없습니다.
          </p>
        )}
      </header>

      <section aria-labelledby="key-h" className="grid gap-2 sm:grid-cols-3">
        <h2 id="key-h" className="sr-only">
          {t("핵심 수치", "Key figures")}
        </h2>
        {cards.map(([k, v, u]) => (
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
          {t("항목별 빈칸 비율", "Share of blanks by item")}
        </h2>
        <p className="mb-4 text-sm text-muted">
          {t(
            "빈칸이 많은 순. 막대가 길수록 공공데이터로 확인할 수 없는 휴양림이 많습니다.",
            "Most blank first. A longer bar means more forests where public data cannot confirm the item.",
          )}
        </p>
        {bars(access)}
      </section>

      <section aria-labelledby="fg-h" className="card p-4 sm:p-5">
        <h2 id="fg-h" className="mb-1 text-xl font-bold">
          {t("외국인 여행자 항목", "Items for foreign visitors")}
        </h2>
        <p className="mb-4 text-sm text-muted">
          {t(
            "예약·결제·신분증·언어 안내는 공공데이터에 없어 대부분 운영기관 확인이 필요합니다. 대중교통은 버스정류장 위치만 있고 노선·배차는 없습니다.",
            "Booking, payment, ID and language support are not in public data, so most need checking with the operator. Transit has only bus stop locations, not routes or frequency.",
          )}
        </p>
        {bars(foreign)}
      </section>

      <section aria-labelledby="room-h" className="card p-4 sm:p-5">
        <h2 id="room-h" className="mb-1 text-xl font-bold">
          {t("국립자연휴양림 객실 설명에서 찾은 키워드", "Keywords found in national forest room descriptions")}
        </h2>
        <p className="mb-4 text-sm text-muted">
          {en
            ? `Text analysis of the free-text descriptions of ${nf(stats.roomKeywordStats[0].total)} rooms`
            : `숙박 객실 ${nf(stats.roomKeywordStats[0].total)}실의 ‘상품설명’(자유서술) 텍스트 분석`}
        </p>
        <ul className="space-y-2.5">
          {stats.roomKeywordStats.map((k) => (
            <li key={k.label} className="grid grid-cols-[8.5rem_1fr_3.5rem] items-center gap-3 text-sm">
              <span className="font-medium">{en ? (KW_EN[k.label] ?? k.label) : k.label}</span>
              <div className="h-2 overflow-hidden rounded-full bg-[var(--blank-bg)]">
                <div className="h-full rounded-full bg-[var(--brand)]" style={{ width: `${(k.count / k.total) * 100}%` }} />
              </div>
              <span className="text-right font-semibold tabular-nums">
                {k.count}
                {t("실", "")}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="log-h" className="space-y-3">
        <div>
          <h2 id="log-h" className="text-xl font-bold">
            {t("데이터 개선 의견", "Data improvement proposals")}
          </h2>
          <p className="text-sm text-muted">
            {en
              ? `Problems found while combining the data, their effect on visitors, and proposals (${stats.improveLog.length})`
              : `결합 과정에서 발견한 문제와 이용자 영향, 개선 제안 (${stats.improveLog.length}건)`}
          </p>
        </div>
        <ol className="space-y-2">
          {(stats.improveLog as Log[]).map((l, i) => (
            <li key={i} className="card p-4">
              <p className="text-xs font-semibold text-brand-strong">{en ? (l.dataset_en ?? l.dataset) : l.dataset}</p>
              <p className="mt-1 font-semibold">{en ? (l.problem_en ?? l.problem) : l.problem}</p>
              <dl className="mt-2 grid gap-1 text-sm sm:grid-cols-2 sm:gap-4">
                <div>
                  <dt className="text-xs text-muted">{t("이용자 영향", "Effect on visitors")}</dt>
                  <dd>{en ? (l.impact_en ?? l.impact) : l.impact}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">{t("개선 제안", "Proposal")}</dt>
                  <dd>{en ? (l.proposal_en ?? l.proposal) : l.proposal}</dd>
                </div>
              </dl>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
