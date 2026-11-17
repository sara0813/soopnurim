import type { Metadata } from "next";
import Link from "next/link";
import { Fragment } from "react";
import { ExternalLink } from "lucide-react";
import stats from "@/data/stats.json";
import { FORESTS, SOURCES, buildJourney } from "@/lib/journey";
import { STEPS } from "@/lib/groups";

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

const FILTERS: [string, string][] = [
  ["숙박 가능", "전국휴양림표준데이터 '숙박가능여부', 국립휴양림은 시설관련 정보의 객실 유무"],
  ["장애인 추첨·우선예약 객실", "우선예약 및 추첨예약 정책의 장애인 추첨 객실 수, 시설관련 정보 객실 설명의 '장애인 우선'"],
  ["장애인 할인", "숲나들e 휴양림할인정책정보에서 대상이 장애인인 할인"],
  ["1.5km 안 장애인 화장실", "전국공중화장실표준데이터의 좌표와 장애인용 변기 수 (휴양림 좌표에서 직선거리)"],
  ["무장애나눔길 3km 안", "무장애나눔길 조성정보의 좌표 (휴양림 좌표에서 직선거리)"],
  ["유아숲체험원", "전국휴양림표준데이터 '주요시설명'의 유아숲 단어, 유아숲체험원 현황의 소재지"],
  ["다자녀 추첨 객실", "우선예약 및 추첨예약 정책의 다자녀 추첨 객실 수"],
  ["국립", "전국휴양림표준데이터 '휴양림구분', 국립자연휴양림관리소 데이터 수록 여부"],
  ["휴장 제외", "휴양림 이름에 '휴장'이 표기된 곳 제외"],
];

const shortName = (n: string) => n.split("_").pop() ?? n;

/** 여정 항목별로, 실제 화면에 채워진 정보가 어느 데이터셋에서 왔는지 전국 휴양림 기준으로 센다 */
function itemSources() {
  const by = new Map<string, { step: number; label: string; total: number; known: number; src: Map<string, number> }>();
  for (const f of FORESTS) {
    for (const it of buildJourney(f)) {
      const e = by.get(it.key) ?? { step: it.step, label: it.label, total: 0, known: 0, src: new Map() };
      e.total++;
      if (it.status !== "unknown") {
        e.known++;
        const name = it.source === "public" ? shortName(it.sourceLabel ?? "공공데이터") : "운영자 전화 확인";
        e.src.set(name, (e.src.get(name) ?? 0) + 1);
      }
      by.set(it.key, e);
    }
  }
  return [...by.values()];
}

export default function DataPage() {
  const items = itemSources();
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

      <section aria-labelledby="how-h" className="card space-y-2 p-4 sm:p-5">
        <h2 id="how-h" className="text-xl font-bold">
          수집 방식
        </h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            모든 공공데이터는 공공데이터포털에서 <strong>파일로 내려받아</strong>(파일데이터·표준데이터) 서비스를 만들 때 정적
            데이터로 넣었습니다. 화면을 볼 때 외부 API를 실시간으로 부르지 않으므로, 외부 서버 장애와 상관없이 같은 정보가
            보입니다.
          </li>
          <li>데이터를 새로 받으려면 수집 스크립트를 다시 실행하고 다시 배포합니다. 데이터셋마다 기준일을 화면에 적습니다.</li>
          <li>이용자 제보만 숲누림 서버(Upstash Redis)에 저장하고, 화면을 열 때 불러옵니다.</li>
        </ul>
      </section>

      <section aria-labelledby="map-h" className="card p-4 sm:p-5">
        <h2 id="map-h" className="text-xl font-bold">
          여정 항목별 근거 데이터
        </h2>
        <p className="mb-4 mt-1 text-sm text-muted">
          휴양림 상세의 여정 체크 {items.length}개 항목이 어떤 데이터로 채워졌는지, 전국 휴양림 {FORESTS.length}곳 기준으로
          셌습니다. 괄호 안은 그 데이터로 채워진 휴양림 수입니다. 어느 데이터에도 없으면 &lsquo;빈칸&rsquo;으로 두고 전화 질문으로
          바꿉니다.
        </p>
        <div className="space-y-4">
          {STEPS.map((st) => (
            <div key={st.step}>
              <h3 className="mb-1.5 text-sm font-semibold text-brand-strong">
                {st.step}. {st.title}
              </h3>
              <ul className="divide-y divide-line rounded-xl border border-line">
                {items
                  .filter((i) => i.step === st.step)
                  .map((i) => (
                    <li key={i.label} className="grid gap-1 px-3 py-2.5 text-sm sm:grid-cols-[12rem_6rem_1fr] sm:gap-3">
                      <span className="font-medium">{i.label}</span>
                      <span className="tabular-nums text-muted">
                        채워짐 {i.known}/{i.total}
                      </span>
                      <span className="flex flex-wrap gap-1.5">
                        {i.known === 0 ? (
                          <span className="src src-blank">공공데이터 없음 · 전화 질문으로 안내</span>
                        ) : (
                          [...i.src]
                            .sort((a, b) => b[1] - a[1])
                            .map(([n, c]) => (
                              <span key={n} className="tag">
                                {n} ({c})
                              </span>
                            ))
                        )}
                      </span>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="calc-h" className="card space-y-3 p-4 sm:p-5">
        <h2 id="calc-h" className="text-xl font-bold">
          목록 정렬과 필터는 무엇으로 계산하나요?
        </h2>
        <div className="space-y-1">
          <h3 className="font-semibold">정보 확인도</h3>
          <p>
            정보 확인도 = 선택한 이용자 유형(휠체어·고령자·유아)에 필요한 여정 항목 중 <strong>공공데이터나 운영자 확인으로 채워진
            항목 수 ÷ 필요한 항목 수</strong>입니다. 이용자 제보와 온라인 자료 참고는 넣지 않습니다. 접근성 점수가 아니라 &lsquo;미리
            확인할 수 있는 정보가 얼마나 있는가&rsquo;를 뜻합니다.
          </p>
        </div>
        <div>
          <h3 className="mb-1.5 font-semibold">목록 필터</h3>
          <dl className="kv text-sm">
            {FILTERS.map(([k, v]) => (
              <Fragment key={k}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </Fragment>
            ))}
          </dl>
        </div>
        <p className="text-sm text-muted">
          &lsquo;내 위치에서 가까운 순&rsquo;은 기기 안에서 휴양림 좌표와의 직선거리로 계산하며, 위치는 저장·전송하지 않습니다.
        </p>
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
            <>국립자연휴양림관리소 데이터 9종(예약정책·할인·경쟁률·가동률·배치도·이용불가·안전점검·공사이력·홍보)을 휴양림명으로 연결</>,
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
                          <dt>수집 방식</dt>
                          <dd>
                            공공데이터포털 {s.kind.includes("표준") ? "표준데이터" : "파일데이터"} 내려받기 (실시간 API 호출 없음)
                          </dd>
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
