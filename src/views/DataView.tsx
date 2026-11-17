import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import { ExternalLink } from "lucide-react";
import stats from "@/data/stats.json";
import { DATASET_COUNT, FORESTS, SOURCES, buildJourney, sourceName } from "@/lib/journey";
import { STEPS } from "@/lib/groups";
import { href, type Lang } from "@/lib/i18n";

const DS_GROUPS: { title: string; title_en: string; keys: string[] }[] = [
  { title: "휴양림 기본 정보", title_en: "Basic forest information", keys: ["std", "natintro"] },
  {
    title: "국립자연휴양림 객실·예약 (산림청 국립자연휴양림관리소)",
    title_en: "National forest rooms and booking (National Forest Recreation Service)",
    keys: ["natfac", "natpolicy", "natdiscount", "natcompetition", "natoccupancy", "natlayout", "natclosure"],
  },
  { title: "시설 관리 (산림청 국립자연휴양림관리소)", title_en: "Facility management (National Forest Recreation Service)", keys: ["natsafety", "natworks"] },
  { title: "숲길·산림복지 시설", title_en: "Trails and forest welfare facilities", keys: ["nanum", "kidsforest", "healing"] },
  { title: "다른 기관 데이터와 결합", title_en: "Combined with other agencies' data", keys: ["toilet", "busstop", "rail", "touristinfo", "jeju"] },
  {
    title: "빠진 휴양림 보완 (기관 누리집 공식 목록, 공공데이터 종 수에는 넣지 않음)",
    title_en: "Filling in missing forests (official agency lists, not counted as datasets)",
    keys: ["kfslist", "ftlist"],
  },
];

const FILTERS: [string, string, string, string][] = [
  ["숙박 가능", "전국휴양림표준데이터 '숙박가능여부', 국립휴양림은 시설관련 정보의 객실 유무",
    "Overnight stay", "'Lodging available' in the standard data; for national forests, whether rooms exist in the facility data"],
  ["장애인 추첨·우선예약 객실", "우선예약 및 추첨예약 정책의 장애인 추첨 객실 수, 시설관련 정보 객실 설명의 '장애인 우선'",
    "Disabled lottery/priority rooms", "Disabled lottery rooms in the booking policy data, and 'disabled priority' in room descriptions"],
  ["장애인 할인", "숲나들e 휴양림할인정책정보에서 대상이 장애인인 할인",
    "Disability discount", "Discounts for people with disabilities in the Foresttrip discount policy data"],
  ["1.5km 안 장애인 화장실", "전국공중화장실표준데이터의 좌표와 장애인용 변기 수 (휴양림 좌표에서 직선거리)",
    "Accessible toilet within 1.5 km", "Coordinates and accessible toilet counts in the public toilet data (straight-line distance)"],
  ["무장애나눔길 3km 안", "무장애나눔길 조성정보의 좌표 (휴양림 좌표에서 직선거리)",
    "Barrier-free trail within 3 km", "Coordinates in the barrier-free trail data (straight-line distance)"],
  ["버스정류장 1km 안", "전국버스정류장 위치정보의 좌표 (휴양림 좌표에서 직선거리, 노선·배차는 없음)",
    "Bus stop within 1 km", "Coordinates in the nationwide bus stop data (straight-line distance; no routes or frequency)"],
  ["유아숲체험원", "전국휴양림표준데이터 '주요시설명'의 유아숲 단어, 유아숲체험원 현황의 소재지",
    "Children's forest", "'Children's forest' in the standard data's main facilities, and the children's forest center list"],
  ["다자녀 추첨 객실", "우선예약 및 추첨예약 정책의 다자녀 추첨 객실 수",
    "Large-family lottery", "Large-family lottery rooms in the booking policy data"],
  ["국립", "전국휴양림표준데이터 '휴양림구분', 국립자연휴양림관리소 데이터 수록 여부",
    "National", "'Forest type' in the standard data, or listed in National Forest Recreation Service data"],
  ["휴장 제외", "휴양림 이름에 '휴장'이 표기된 곳 제외",
    "Hide closed", "Excludes forests whose name is marked 'closed'"],
];

const shortName = (n: string) => n.split("_").pop() ?? n;

/** 여정 항목별로, 실제 화면에 채워진 정보가 어느 데이터셋에서 왔는지 전국 휴양림 기준으로 센다 */
function itemSources(lang: Lang) {
  const by = new Map<string, { key: string; step: number; label: string; total: number; known: number; src: Map<string, number> }>();
  for (const f of FORESTS) {
    for (const it of buildJourney(f, lang)) {
      const e = by.get(it.key) ?? { key: it.key, step: it.step, label: it.label, total: 0, known: 0, src: new Map() };
      e.total++;
      if (it.status !== "unknown") {
        e.known++;
        const name =
          it.source === "public"
            ? shortName(it.sourceLabel ?? (lang === "en" ? "Public data" : "공공데이터"))
            : lang === "en"
              ? "Operator phone check"
              : "운영자 전화 확인";
        e.src.set(name, (e.src.get(name) ?? 0) + 1);
      }
      by.set(it.key, e);
    }
  }
  return [...by.values()];
}

export default function DataView({ lang }: { lang: Lang }) {
  const en = lang === "en";
  const t = (ko: string, e: string) => (en ? e : ko);
  const nf = (n: number) => n.toLocaleString(en ? "en-US" : "ko-KR");
  const items = itemSources(lang);
  const counts = stats.rowCounts as Record<string, number>;
  const surveyPts = FORESTS.reduce((a, f) => a + (f.survey?.points.length ?? 0), 0);
  const linked = (k: string) => FORESTS.filter((f) => f.sources.includes(k)).length;
  const total = DATASET_COUNT;
  const forestCount = Object.values(SOURCES).filter((s) => s.kind.startsWith("산림") && !s.notPortal).length;
  const records = Object.values(counts).reduce((a, b) => a + b, 0);
  const code = (s: string) => <code className="text-sm">{s}</code>;

  const pipeline: ReactNode[] = en
    ? [
        <>Download the original files from the Public Data Portal ({code("scripts/fetch_data.py")})</>,
        <>
          Clean duplicates in the standard data: {stats.stdRows} records → {stats.stdUnique} forests ({stats.stdDuplicates}{" "}
          cases where several agencies registered the same forest)
        </>,
        <>
          Join national forest facility data: add {stats.nationalNotInStd} national forests missing from the standard data →{" "}
          {stats.forestTotal} in total
        </>,
        <>
          Link 9 National Forest Recreation Service datasets (booking policy, discounts, competition, occupancy, layouts,
          closures, safety checks, works, introductions) by forest name
        </>,
        <>
          Link data without a shared ID by coordinates or address: barrier-free trails 3 km, public toilets 1.5 km, bus stops
          3 km, children&rsquo;s forests and healing forests by name and city/county
        </>,
        <>Extract keywords (disabled, bed, ondol, loft, deck road, check-in time, barbecue) from room, facility and works text</>,
        <>
          Turn everything into check items for each trip step ({code("scripts/build_data.py")}, {code("src/lib/journey.ts")})
        </>,
      ]
    : [
        <>공공데이터포털에서 원본 내려받기 ({code("scripts/fetch_data.py")})</>,
        <>
          전국휴양림표준데이터 중복 정리: {stats.stdRows}건 → {stats.stdUnique}곳 (같은 휴양림을 여러 기관이 각각 등록한 사례{" "}
          {stats.stdDuplicates}건)
        </>,
        <>
          국립자연휴양림 시설정보 결합: 표준데이터에 없는 국립휴양림 {stats.nationalNotInStd}곳 추가 → 총 {stats.forestTotal}곳
        </>,
        <>국립자연휴양림관리소 데이터 9종(예약정책·할인·경쟁률·가동률·배치도·이용불가·안전점검·공사이력·홍보)을 휴양림명으로 연결</>,
        <>
          공통 ID가 없는 데이터는 좌표·주소로 연결: 무장애나눔길 3km, 공중화장실 1.5km, 버스정류장 3km, 유아숲체험원·치유의숲은
          이름과 시·군·구
        </>,
        <>객실 설명·주요시설명·공사명 텍스트에서 장애인·침대·온돌·다락·데크로드·입실 시간·바비큐 같은 키워드 추출</>,
        <>
          여정 단계별 확인 항목으로 변환 ({code("scripts/build_data.py")}, {code("src/lib/journey.ts")})
        </>,
      ];

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="eyebrow">{t("데이터 출처", "Data sources")}</p>
        <h1 className="text-[1.7rem] font-bold sm:text-3xl">{t("데이터 출처와 가공 방법", "Data sources and processing")}</h1>
        <p className="max-w-2xl text-muted">
          {en
            ? `Everything in Soopnurim comes from the ${total} public datasets below (${forestCount} from the forest sector). Each item on screen shows which dataset it came from and its reference date. Dataset names and field values are translated for this page; the originals are in Korean.`
            : `숲누림의 모든 정보는 아래 공공데이터 ${total}종(산림 분야 ${forestCount}종)에서 나옵니다. 화면의 각 항목에는 어느 데이터셋의 언제 기준 정보인지 함께 적어 두었습니다.`}
        </p>
      </header>

      <section aria-labelledby="sum-h" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <h2 id="sum-h" className="sr-only">
          {t("요약", "Summary")}
        </h2>
        {(en
          ? [
              ["Datasets combined", `${total}`],
              ["Original records", nf(records)],
              ["Forests linked", `${stats.forestTotal}`],
              ["National forests added", `${stats.nationalNotInStd}`],
            ]
          : [
              ["결합한 데이터셋", `${total}종`],
              ["원본 레코드", `${nf(records)}건`],
              ["연결한 휴양림", `${stats.forestTotal}곳`],
              ["표준데이터에 없던 국립휴양림", `${stats.nationalNotInStd}곳 추가`],
            ]
        ).map(([k, v]) => (
          <div key={k} className="card p-4">
            <p className="text-xs font-medium text-muted">{k}</p>
            <p className="mt-0.5 text-xl font-bold tabular-nums">{v}</p>
          </div>
        ))}
      </section>

      <section aria-labelledby="how-h" className="card space-y-2 p-4 sm:p-5">
        <h2 id="how-h" className="text-xl font-bold">
          {t("수집 방식", "How data is collected")}
        </h2>
        {en ? (
          <ul className="list-disc space-y-1 pl-5">
            <li>
              All public data is <strong>downloaded as files</strong> (file data and standard data) from the Public Data Portal
              and built into the service as static data. No external API is called while you browse, so the same information
              appears even if an outside server is down.
            </li>
            <li>To refresh the data, the collection scripts are run again and the site is redeployed. Each dataset shows its reference date.</li>
            <li>Only visitor reports are stored on the Soopnurim server (Upstash Redis) and loaded when a page opens.</li>
          </ul>
        ) : (
          <ul className="list-disc space-y-1 pl-5">
            <li>
              모든 공공데이터는 공공데이터포털에서 <strong>파일로 내려받아</strong>(파일데이터·표준데이터) 서비스를 만들 때 정적
              데이터로 넣었습니다. 화면을 볼 때 외부 API를 실시간으로 부르지 않으므로, 외부 서버 장애와 상관없이 같은 정보가
              보입니다.
            </li>
            <li>데이터를 새로 받으려면 수집 스크립트를 다시 실행하고 다시 배포합니다. 데이터셋마다 기준일을 화면에 적습니다.</li>
            <li>이용자 제보만 숲누림 서버(Upstash Redis)에 저장하고, 화면을 열 때 불러옵니다.</li>
          </ul>
        )}
      </section>

      <section aria-labelledby="map-h" className="card p-4 sm:p-5">
        <h2 id="map-h" className="text-xl font-bold">
          {t("여정 항목별 근거 데이터", "Data behind each trip item")}
        </h2>
        <p className="mb-4 mt-1 text-sm text-muted">
          {en ? (
            <>
              Which data filled each of the {items.length} trip check items, counted across {FORESTS.length} forests. The number in
              brackets is how many forests that data filled. If no data has it, the item is left &lsquo;blank&rsquo; and becomes a
              phone question.
            </>
          ) : (
            <>
              휴양림 상세의 여정 체크 {items.length}개 항목이 어떤 데이터로 채워졌는지, 전국 휴양림 {FORESTS.length}곳 기준으로
              셌습니다. 괄호 안은 그 데이터로 채워진 휴양림 수입니다. 어느 데이터에도 없으면 &lsquo;빈칸&rsquo;으로 두고 전화
              질문으로 바꿉니다.
            </>
          )}
        </p>
        <div className="space-y-4">
          {STEPS.map((st) => (
            <div key={st.step}>
              <h3 className="mb-1.5 text-sm font-semibold text-brand-strong">
                {st.step}. {en ? st.title_en : st.title}
              </h3>
              <ul className="divide-y divide-line rounded-xl border border-line">
                {items
                  .filter((i) => i.step === st.step)
                  .map((i) => (
                    <li key={i.key} className="grid min-w-0 grid-cols-1 gap-1 px-3 py-2.5 text-sm sm:grid-cols-[12rem_6rem_1fr] sm:gap-3">
                      <span className="font-medium">{i.label}</span>
                      <span className="tabular-nums text-muted">
                        {t("채워짐", "Filled")} {i.known}/{i.total}
                      </span>
                      <span className="flex flex-wrap gap-1.5">
                        {i.known === 0 ? (
                          <span className="src src-blank">
                            {t("공공데이터 없음 · 전화 질문으로 안내", "No public data · turned into a phone question")}
                          </span>
                        ) : (
                          [...i.src]
                            .sort((a, b) => b[1] - a[1])
                            .map(([n, c]) => (
                              <span key={n} className="tag tag-wrap">
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
          {t("목록 정렬과 필터는 무엇으로 계산하나요?", "How are list sorting and filters calculated?")}
        </h2>
        <div className="space-y-1">
          <h3 className="font-semibold">{t("정보 확인도", "Information coverage")}</h3>
          {en ? (
            <p>
              Information coverage counts, among the trip items needed by the visitor types you selected,{" "}
              <strong>how many are filled by public data or an operator check</strong>, shown as e.g. &lsquo;8/15 items&rsquo;.
              With no type selected, all items are counted. Visitor reports and online references are not included. It is not
              an accessibility score: it shows how much can be checked in advance, not whether a forest is safer or easier to
              use. Sorting by coverage uses the share of filled items, and treats forests with no items as 0.
            </p>
          ) : (
            <p>
              정보 확인도는 선택한 이용자 유형에 필요한 여정 항목 중 <strong>공공데이터나 운영자 확인으로 채워진 항목 수</strong>를
              &lsquo;8/15항목&rsquo;처럼 셉니다. 유형을 고르지 않으면 휠체어·고령자·유아 동반 세 유형의 항목을 모두 셉니다. 이용자
              제보와 온라인 자료 참고는 넣지 않습니다. 접근성 점수가 아니라 &lsquo;미리 확인할 수 있는 정보가 얼마나
              있는가&rsquo;를 뜻하며, 시설이 더 안전하거나 이용하기 좋다는 뜻은 아닙니다. 확인도순 정렬은 채워진 비율로 하며,
              필요한 항목이 없으면 0으로 둡니다.
            </p>
          )}
        </div>
        <div>
          <h3 className="mb-1.5 font-semibold">{t("목록 필터", "List filters")}</h3>
          <dl className="kv text-sm">
            {FILTERS.map(([k, v, ke, ve]) => (
              <Fragment key={k}>
                <dt>{en ? ke : k}</dt>
                <dd>{en ? ve : v}</dd>
              </Fragment>
            ))}
          </dl>
        </div>
        <p className="text-sm text-muted">
          {t(
            "‘내 위치에서 가까운 순’은 기기 안에서 휴양림 좌표와의 직선거리로 계산하며, 위치는 저장·전송하지 않습니다. 위치 정보가 없는 휴양림은 맨 뒤에 둡니다. 주변 시설 거리도 모두 직선거리라 실제 길이나 휴양림 안에 있는지는 알 수 없습니다.",
            "‘Nearest to me’ uses the straight-line distance to each forest, calculated on your device; your location is not stored or sent. Forests without coordinates go last. Distances to nearby facilities are also straight-line, so the actual route, or whether a facility is inside the forest, is unknown.",
          )}
        </p>
      </section>

      <section aria-labelledby="pipe-h" className="card p-4 sm:p-5">
        <h2 id="pipe-h" className="mb-3 text-xl font-bold">
          {t("가공 흐름", "Processing steps")}
        </h2>
        <ol className="space-y-2.5">
          {pipeline.map((p, i) => (
            <li key={i} className="flex gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-bold text-brand-strong">
                {i + 1}
              </span>
              <span>{p}</span>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="ds-h" className="space-y-5">
        <h2 id="ds-h" className="text-xl font-bold">
          {t("데이터셋별 상세", "Dataset details")}
        </h2>
        {DS_GROUPS.map((g) => (
          <div key={g.title} className="space-y-2">
            <h3 className="text-sm font-semibold text-muted">{en ? g.title_en : g.title}</h3>
            <ul className="space-y-2">
              {g.keys
                .filter((k) => SOURCES[k])
                .map((k) => {
                  const s = SOURCES[k];
                  const pick = (ko: string, e?: string) => (en ? (e ?? ko) : ko);
                  return (
                    <li key={k}>
                      <details className="card group">
                        <summary className="flex cursor-pointer items-start gap-3 p-4">
                          <span className="min-w-0 flex-1">
                            <span className="block text-xs text-muted">{pick(s.kind, s.kind_en)}</span>
                            <span className="block font-semibold">{sourceName(s, lang)}</span>
                            {en && <span lang="ko" className="block text-xs text-muted">{s.name}</span>}
                            <span className="mt-0.5 block text-sm text-muted">
                              {k === "jeju"
                                ? t(`현장조사 지점 ${surveyPts}곳`, `${surveyPts} surveyed points`)
                                : t(`원본 ${counts[k] != null ? nf(counts[k]) : "–"}건`, `${counts[k] != null ? nf(counts[k]) : "–"} records`)}{" "}
                              · {t(`연결된 휴양림 ${linked(k)}곳`, `${linked(k)} forests linked`)}
                            </span>
                          </span>
                          <span className="tag mt-1 shrink-0 group-open:hidden">{t("자세히", "More")}</span>
                          <span className="tag mt-1 hidden shrink-0 group-open:inline-flex">{t("접기", "Less")}</span>
                        </summary>
                        <dl className="kv border-t border-line p-4 text-sm">
                          <dt>{t("제공기관", "Provider")}</dt>
                          <dd>{pick(s.org, s.org_en)}</dd>
                          <dt>{t("기준일", "Reference date")}</dt>
                          <dd>
                            {s.refDate ??
                              t("레코드별 기준일·연도 (화면에 항목마다 표시)", "Per record (shown with each item on screen)")}
                          </dd>
                          <dt>{t("수집 방식", "Collection")}</dt>
                          <dd>
                            {en
                              ? `Downloaded as ${s.kind.includes("표준") ? "standard data" : "file data"} from the Public Data Portal (no live API calls)`
                              : `공공데이터포털 ${s.kind.includes("표준") ? "표준데이터" : "파일데이터"} 내려받기 (실시간 API 호출 없음)`}
                          </dd>
                          <dt>{t("이용조건", "Terms of use")}</dt>
                          <dd>{en ? (s.notPortal ? "Published on an agency website" : "Public Data Portal, no restrictions on use") : s.license}</dd>
                          <dt>{t("사용 필드", "Fields used")}</dt>
                          <dd>{pick(s.fields, s.fields_en)}</dd>
                          <dt>{t("가공", "Processing")}</dt>
                          <dd>{pick(s.processing, s.processing_en)}</dd>
                          <dt>{t("쓰이는 곳", "Used in")}</dt>
                          <dd>{pick(s.usedIn, s.usedIn_en)}</dd>
                          <dt>{t("원본", "Original")}</dt>
                          <dd>
                            <a
                              href={s.url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-brand-strong underline underline-offset-2"
                            >
                              {t("공공데이터포털에서 보기", "View on the Public Data Portal (Korean)")}{" "}
                              <ExternalLink aria-hidden="true" className="size-3.5" />
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
        <h2 className="text-base font-semibold text-fg">{t("기타", "Other")}</h2>
        <p>
          {t(
            "지도 바탕: © OpenStreetMap contributors (ODbL). 아이콘: Lucide (ISC). 글꼴: Pretendard (OFL). 로마자 표기는 국어의 로마자 표기법을 따라 자동 변환했습니다.",
            "Base map: © OpenStreetMap contributors (ODbL). Icons: Lucide (ISC). Font: Pretendard (OFL). Place names are romanized automatically following the Revised Romanization of Korean.",
          )}
        </p>
        <p>
          {en ? (
            <>
              Problems found in the data and proposals are collected on the{" "}
              <Link href={href(lang, "/gaps")} className="underline underline-offset-2">
                nationwide gaps
              </Link>{" "}
              page.
            </>
          ) : (
            <>
              데이터에서 발견한 문제와 개선 제안은{" "}
              <Link href="/gaps" className="underline underline-offset-2">
                전국 빈칸
              </Link>{" "}
              페이지에 정리했습니다.
            </>
          )}
        </p>
      </section>
    </div>
  );
}
