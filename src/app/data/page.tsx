import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import stats from "@/data/stats.json";
import { FORESTS, SOURCES } from "@/lib/journey";

export const metadata: Metadata = { title: "데이터 출처와 가공 방법" };

const GROUPS: { title: string; keys: string[] }[] = [
  { title: "휴양림 기본 정보", keys: ["std", "natintro"] },
  {
    title: "국립자연휴양림 객실·예약 (산림청 국립자연휴양림관리소)",
    keys: ["natfac", "natpolicy", "natdiscount", "natcompetition", "natoccupancy", "natlayout", "natclosure"],
  },
  { title: "시설 관리 (산림청 국립자연휴양림관리소)", keys: ["natsafety", "natworks"] },
  { title: "숲길·산림복지 시설", keys: ["nanum", "kidsforest", "healing"] },
  { title: "다른 기관 데이터와 결합", keys: ["toilet", "jeju"] },
];

export default function DataPage() {
  const counts = stats.rowCounts as Record<string, number>;
  const surveyPts = FORESTS.reduce((a, f) => a + (f.survey?.points.length ?? 0), 0);
  const linked = (k: string) => FORESTS.filter((f) => f.sources.includes(k)).length;
  const total = Object.keys(SOURCES).length;
  const forestCount = Object.values(SOURCES).filter((s) => s.kind.startsWith("산림")).length;

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="eyebrow">데이터 출처</p>
        <h1 className="text-[1.7rem] font-bold sm:text-3xl">데이터 출처와 가공 방법</h1>
        <p className="max-w-2xl text-muted">
          숲누림의 모든 정보는 아래 공공데이터 {total}종(산림 분야 {forestCount}종)에서 나옵니다. 화면의 각 항목에는 어느
          데이터셋의 언제 기준 정보인지 함께 적어 두었습니다.
        </p>
      </header>

      <section aria-labelledby="sum-h" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <h2 id="sum-h" className="sr-only">
          요약
        </h2>
        {[
          ["결합한 데이터셋", `${total}종`],
          ["원본 레코드", `${Object.values(counts).reduce((a, b) => a + b, 0).toLocaleString()}건`],
          ["연결한 휴양림", `${stats.forestTotal}곳`],
          ["표준데이터에 없던 국립휴양림", `${stats.nationalNotInStd}곳 추가`],
        ].map(([k, v]) => (
          <div key={k} className="card p-4">
            <p className="text-xs font-medium text-muted">{k}</p>
            <p className="mt-0.5 text-xl font-bold tabular-nums">{v}</p>
          </div>
        ))}
      </section>

      <section aria-labelledby="pipe-h" className="card p-4 sm:p-5">
        <h2 id="pipe-h" className="mb-3 text-xl font-bold">
          가공 흐름
        </h2>
        <ol className="space-y-2.5">
          {[
            <>
              공공데이터포털에서 원본 내려받기 (<code className="text-sm">scripts/fetch_data.py</code>)
            </>,
            <>
              전국휴양림표준데이터 중복 정리: {stats.stdRows}건 → {stats.stdUnique}곳 (같은 휴양림을 여러 기관이 각각 등록한
              사례 {stats.stdDuplicates}건)
            </>,
            <>
              국립자연휴양림 시설정보 결합: 표준데이터에 없는 국립휴양림 {stats.nationalNotInStd}곳 추가 → 총 {stats.forestTotal}곳
            </>,
            <>국립자연휴양림관리소 데이터 10종(예약정책·할인·경쟁률·가동률·배치도·이용불가·안전점검·공사이력·홍보)을 휴양림명으로 연결</>,
            <>
              공통 ID가 없는 데이터는 좌표·주소로 연결: 무장애나눔길 3km, 공중화장실 1.5km, 유아숲체험원·치유의숲은 이름과 시·군·구
            </>,
            <>객실 설명·주요시설명·공사명 텍스트에서 장애인·침대·온돌·다락·데크로드 같은 키워드 추출</>,
            <>
              여정 단계별 확인 항목으로 변환 (<code className="text-sm">scripts/build_data.py</code>,{" "}
              <code className="text-sm">src/lib/journey.ts</code>)
            </>,
          ].map((t, i) => (
            <li key={i} className="flex gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-bold text-brand-strong">
                {i + 1}
              </span>
              <span>{t}</span>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="ds-h" className="space-y-5">
        <h2 id="ds-h" className="text-xl font-bold">
          데이터셋별 상세
        </h2>
        {GROUPS.map((g) => (
          <div key={g.title} className="space-y-2">
            <h3 className="text-sm font-semibold text-muted">{g.title}</h3>
            <ul className="space-y-2">
              {g.keys
                .filter((k) => SOURCES[k])
                .map((k) => {
                  const s = SOURCES[k];
                  return (
                    <li key={k}>
                      <details className="card group">
                        <summary className="flex cursor-pointer items-start gap-3 p-4">
                          <span className="min-w-0 flex-1">
                            <span className="block text-xs text-muted">{s.kind}</span>
                            <span className="block font-semibold">{s.name}</span>
                            <span className="mt-0.5 block text-sm text-muted">
                              {k === "jeju" ? `현장조사 지점 ${surveyPts}곳` : `원본 ${counts[k]?.toLocaleString() ?? "–"}건`} · 연결된
                              휴양림 {linked(k)}곳
                            </span>
                          </span>
                          <span className="tag mt-1 shrink-0 group-open:hidden">자세히</span>
                          <span className="tag mt-1 hidden shrink-0 group-open:inline-flex">접기</span>
                        </summary>
                        <dl className="kv border-t border-line p-4 text-sm">
                          <dt>제공기관</dt>
                          <dd>{s.org}</dd>
                          <dt>기준일</dt>
                          <dd>{s.refDate ?? "레코드별 기준일·연도 (화면에 항목마다 표시)"}</dd>
                          <dt>이용조건</dt>
                          <dd>{s.license}</dd>
                          <dt>사용 필드</dt>
                          <dd>{s.fields}</dd>
                          <dt>가공</dt>
                          <dd>{s.processing}</dd>
                          <dt>쓰이는 곳</dt>
                          <dd>{s.usedIn}</dd>
                          <dt>원본</dt>
                          <dd>
                            <a
                              href={s.url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-brand-strong underline underline-offset-2"
                            >
                              공공데이터포털에서 보기 <ExternalLink aria-hidden="true" className="size-3.5" />
                            </a>
                          </dd>
                        </dl>
                      </details>
                    </li>
                  );
                })}
            </ul>
          </div>
        ))}
      </section>

      <section className="card space-y-1 p-4 text-sm text-muted">
        <h2 className="text-base font-semibold text-fg">기타</h2>
        <p>지도 바탕: © OpenStreetMap contributors (ODbL). 아이콘: Lucide (ISC). 글꼴: Pretendard (OFL).</p>
        <p>
          데이터에서 발견한 문제와 개선 제안은{" "}
          <Link href="/gaps" className="underline underline-offset-2">
            전국 빈칸
          </Link>{" "}
          페이지에 정리했습니다.
        </p>
      </section>
    </div>
  );
}
