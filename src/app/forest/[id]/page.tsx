import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ExternalLink, Globe, MapPinned, Phone } from "lucide-react";
import JourneyView from "@/components/JourneyView";
import RoomList from "@/components/RoomList";
import { Note, Section, Src, Sub } from "@/components/Section";
import { CORE_KEYS, FORESTS, SOURCES, buildJourney, getForest, km, lotteryOf } from "@/lib/journey";
import type { Place, PlaceLink } from "@/lib/types";

export function generateStaticParams() {
  return FORESTS.map((f) => ({ id: f.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const f = getForest((await params).id);
  return { title: f ? `${f.name} 정보` : "숲 정보" };
}

const SECTIONS = [
  ["info", "개요"],
  ["journey", "여정 체크"],
  ["rooms", "객실"],
  ["booking", "예약·할인"],
  ["nearby", "주변 시설"],
  ["manage", "시설 관리"],
  ["sources", "출처"],
] as const;

const RESULT_CLS: Record<string, string> = { 예: "tag-brand", 아니오: "tag-no", 해당없음: "" };

export default async function ForestPage({ params }: { params: Promise<{ id: string }> }) {
  const f = getForest((await params).id);
  if (!f) notFound();
  const items = buildJourney(f);
  const n = f.national;
  const lot = lotteryOf(f);
  const home = f.homepage ? (f.homepage.startsWith("http") ? f.homepage : `https://${f.homepage}`) : "";
  const telHref = f.tel ? `tel:${f.tel.replace(/[^0-9+]/g, "")}` : "";
  const isNational = !!n || f.ownership === "국유림";
  const b = f.booking;

  return (
    <article className="space-y-5">
      <Link href="/" className="-ml-1 inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-muted hover:text-fg">
        <ChevronLeft aria-hidden="true" className="size-4" /> 숲 목록
      </Link>

      <header className="card space-y-3 p-4 sm:p-6">
        <div className="flex flex-wrap gap-1">
          {f.ownership && <span className={`tag ${f.ownership === "국유림" ? "tag-brand" : ""}`}>{f.ownership}</span>}
          {f.closed && <span className="tag tag-no">휴장</span>}
          <span className="tag">
            {f.sido} {f.sigungu}
          </span>
        </div>
        <h1 className="text-[1.7rem] font-bold sm:text-3xl">{f.name}</h1>
        {f.intro?.desc && <p className="text-muted">{f.intro.desc}</p>}
        <p className="text-sm">{f.address}</p>
        <div className="flex flex-wrap gap-2 pt-1">
          {f.tel && (
            <a href={telHref} className="btn btn-primary">
              <Phone aria-hidden="true" className="size-4" /> {f.tel}
            </a>
          )}
          {home && (
            <a href={home} target="_blank" rel="noreferrer" className="btn btn-outline">
              <Globe aria-hidden="true" className="size-4" /> 홈페이지·예약
            </a>
          )}
          {f.lat && f.lng && (
            <a
              href={`https://map.kakao.com/link/map/${encodeURIComponent(f.name)},${f.lat},${f.lng}`}
              target="_blank"
              rel="noreferrer"
              className="btn btn-outline"
            >
              <MapPinned aria-hidden="true" className="size-4" /> 지도 앱
            </a>
          )}
        </div>
      </header>

      <nav
        aria-label="이 페이지 목차"
        className="sticky top-0 z-[1100] -mx-4 border-b border-line bg-[var(--bg)]/95 px-4 py-2 backdrop-blur"
      >
        <ul className="no-scrollbar flex gap-1.5 overflow-x-auto">
          {SECTIONS.map(([id, label]) => (
            <li key={id}>
              <a href={`#${id}`} className="chip">
                {label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {f.notInStd && (
        <p className="rounded-xl border border-[var(--warn)]/30 bg-[var(--warn-bg)] p-3 text-sm text-[var(--warn)]">
          이 국립자연휴양림은 전국휴양림표준데이터에 없어, 국립자연휴양림관리소의 시설정보·예약정책 데이터로 보완해 표시합니다.
        </p>
      )}

      {/* 개요 */}
      <Section id="info" title="개요">
        <dl className="kv">
          <dt>운영</dt>
          <dd>{f.institution || "–"}</dd>
          <dt>숙박</dt>
          <dd>
            {f.stay === true
              ? n
                ? `가능 · 객실 ${n.rooms}실, 야영 ${n.camps}면`
                : "가능"
              : f.stay === false
                ? "숙박시설 없음"
                : "정보 없음"}
          </dd>
          {f.intro?.hours && (
            <>
              <dt>운영 시간</dt>
              <dd>{f.intro.hours}</dd>
            </>
          )}
          {f.capacity != null && (
            <>
              <dt>수용 인원</dt>
              <dd>{f.capacity.toLocaleString()}명</dd>
            </>
          )}
          {f.intro?.builtYear && (
            <>
              <dt>조성 연도</dt>
              <dd>{f.intro.builtYear}년</dd>
            </>
          )}
          {f.areaM2 != null && (
            <>
              <dt>면적</dt>
              <dd>{Math.round(f.areaM2).toLocaleString()}㎡</dd>
            </>
          )}
          {f.admissionFee && (
            <>
              <dt>입장료</dt>
              <dd>{f.admissionFee.replace(/\+/g, ", ")}</dd>
            </>
          )}
          {f.facilities.length > 0 && (
            <>
              <dt>주요 시설</dt>
              <dd>{f.facilities.join(", ")}</dd>
            </>
          )}
          <dt>연락처</dt>
          <dd>{f.tel || "공공데이터에 없음"}</dd>
        </dl>
        {f.layoutMap && (
          <a
            href={f.layoutMap}
            target="_blank"
            rel="noreferrer"
            className="btn btn-outline mt-4 w-full sm:w-auto"
          >
            휴양림 전체 배치도 보기 <ExternalLink aria-hidden="true" className="size-4" />
          </a>
        )}
        {f.sources.includes("std") ? <Src k="std" date={f.refDate} /> : <Src k="natfac" />}
        {f.intro && <Src k="natintro" note="소개·운영시간·조성연도" />}
        {f.layoutMap && <Src k="natlayout" note="배치도 이미지는 숲나들e 서버에 있습니다" />}
        {f.telSource === "natpolicy" && <Note>연락처는 국립자연휴양림 우선예약·추첨예약 정책 데이터에서 보완했습니다.</Note>}
      </Section>

      {/* 여정 체크 + 질문 + 제보 */}
      <Section
        id="journey"
        title="여정 단계별 체크"
        desc="도착부터 안전까지 단계별로 확인된 정보와 빈칸을 보여드립니다. 빈칸은 전화 질문으로 바꾸거나, 다녀온 분이 제보할 수 있습니다."
        plain
      >
        <JourneyView items={items} tel={f.tel} forestId={f.id} forestName={f.name} coreKeys={CORE_KEYS} />
      </Section>

      {/* 객실 */}
      <Section id="rooms" title={`객실${n ? ` ${n.rooms}실` : ""}`}>
        {n && n.roomList.length ? (
          <>
            <RoomList rooms={n.roomList} />
            <Src k="natfac" />
            {lot && <Src k="natpolicy" note="객실별 추첨제 대상" />}
            <Note>&lsquo;언급&rsquo;은 객실 설명 원문에 그 단어가 있다는 뜻입니다. 문턱·문 폭·욕실 구조는 데이터에 없습니다.</Note>
          </>
        ) : (
          <p className="text-muted">
            객실별 상세 데이터는 국립자연휴양림만 공개되어 있습니다. 이 휴양림의 객실 정보는{" "}
            {home ? (
              <a href={home} className="underline" target="_blank" rel="noreferrer">
                홈페이지
              </a>
            ) : (
              "운영기관"
            )}
            에서 확인해 주세요.
          </p>
        )}
      </Section>

      {/* 예약·할인 */}
      <Section id="booking" title="예약·할인">
        <div className="space-y-5">
          {lot ? (
            <Sub title="우선·추첨 예약 객실">
              <ul className="grid gap-2 sm:grid-cols-3">
                {(
                  [
                    ["disabled", "장애인 추첨제", "등록 장애인 회원 대상 추첨"],
                    ["multiChild", "다자녀 추첨제", "다자녀 가정 대상 추첨"],
                    ["voucher", "산림복지 바우처 우선예약", "산림복지서비스이용권 소지자"],
                  ] as const
                ).map(([k, label, desc]) => {
                  const L = lot[k];
                  return (
                    <li key={k} className="rounded-xl border border-line bg-surface-2 p-3">
                      <p className="text-sm text-muted">{label}</p>
                      <p className="text-xl font-bold tabular-nums">{L.count}실</p>
                      <p className="text-xs text-muted">{desc}</p>
                      {L.count > 0 && (
                        <details className="mt-1 text-sm">
                          <summary className="cursor-pointer py-1 font-medium text-brand-strong">객실 이름</summary>
                          <p>{L.rooms.join(", ")}</p>
                          {L.months.length > 0 && (
                            <p className="text-xs text-muted">
                              데이터상 대상 기간 {L.months[0]} ~ {L.months[1]}
                            </p>
                          )}
                        </details>
                      )}
                    </li>
                  );
                })}
              </ul>
              <Src k="natpolicy" />
            </Sub>
          ) : null}

          {f.discounts?.length ? (
            <Sub title="이용료 할인 (객실 시설 사용료)">
              <div className="-mx-1 overflow-x-auto px-1">
                <table className="w-full min-w-[30rem] text-sm">
                  <caption className="sr-only">할인 대상별 할인율</caption>
                  <thead>
                    <tr className="border-b border-line text-left text-muted">
                      <th scope="col" className="py-2 pr-2 font-medium">
                        대상
                      </th>
                      <th scope="col" className="px-2 py-2 text-right font-medium">
                        비수기 평일
                      </th>
                      <th scope="col" className="px-2 py-2 text-right font-medium">
                        비수기 주말
                      </th>
                      <th scope="col" className="px-2 py-2 text-right font-medium">
                        성수기 평일
                      </th>
                      <th scope="col" className="py-2 pl-2 text-right font-medium">
                        성수기 주말
                      </th>
                    </tr>
                  </thead>
                  <tbody className="tabular-nums">
                    {f.discounts.map((d) => (
                      <tr key={d.target} className="border-b border-line last:border-0">
                        <th scope="row" className="py-2 pr-2 text-left font-semibold">
                          {d.target}
                        </th>
                        <td className="px-2 py-2 text-right">{d.offWeekday}%</td>
                        <td className="px-2 py-2 text-right">{d.offWeekend}%</td>
                        <td className="px-2 py-2 text-right">{d.peakWeekday}%</td>
                        <td className="py-2 pl-2 text-right">{d.peakWeekend}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Src k="natdiscount" />
              <Note>할인 자격·증빙 서류는 숲나들e에서 확인하세요. 중증·경증은 데이터의 등급 별칭 그대로 표기했습니다.</Note>
            </Sub>
          ) : null}

          {b ? (
            <Sub title="예약 경쟁">
              <div className="grid gap-2 sm:grid-cols-3">
                {b.lottery?.avgRate != null && (
                  <Stat label={`주말 추첨 평균 경쟁률 (${b.lottery.from} ~ ${b.lottery.to})`} value={`${b.lottery.avgRate} : 1`} />
                )}
                {b.lottery && (
                  <Stat label="경쟁률이 가장 높았던 달" value={`${b.lottery.peakMonth.slice(5)}월 · ${b.lottery.peakRate} : 1`} />
                )}
                {b.occupancy?.weekend != null && (
                  <Stat label={`${b.occupancy.year}년 주말 객실 가동률`} value={`${b.occupancy.weekend}%`} />
                )}
              </div>
              {b.lottery && <MonthlyBars data={b.lottery.monthly} />}
              {b.lottery && <Src k="natcompetition" note="최근 12개월 신청자 합 ÷ 당첨자 합" />}
              {b.occupancy && <Src k="natoccupancy" note={`${b.occupancy.year}년`} />}
            </Sub>
          ) : null}

          {f.closures?.count ? (
            <Sub title="이용불가·위약금 면제 기록">
              <ul className="space-y-1 text-sm">
                {f.closures.items.map((c) => (
                  <li key={c.from + c.title} className="flex flex-wrap gap-x-2">
                    <span className="tabular-nums text-muted">
                      {c.from} ~ {c.to}
                    </span>
                    <span>{c.title}</span>
                  </li>
                ))}
              </ul>
              <Src k="natclosure" note={`전체 ${f.closures.count}건 중 최근 ${f.closures.items.length}건`} />
              <Note>기상특보 등으로 이용이 막혔던 기록입니다. 방문 날짜의 기상특보를 함께 확인하세요.</Note>
            </Sub>
          ) : null}

          {isNational ? (
            <p className="text-sm text-muted">
              실제 신청 일정과 자격은{" "}
              <a href="https://www.foresttrip.go.kr" target="_blank" rel="noreferrer" className="underline underline-offset-2">
                숲나들e(국립자연휴양림 예약)
              </a>
              에서 확인하세요. 데이터 기준일 이후 정책이 바뀌었을 수 있습니다.
            </p>
          ) : !lot && !f.discounts?.length ? (
            <p className="text-muted">
              우선·추첨 예약과 할인 정책은 국립자연휴양림만 공공데이터로 공개되어 있습니다. 이 휴양림은{" "}
              {home ? (
                <a href={home} className="underline" target="_blank" rel="noreferrer">
                  홈페이지
                </a>
              ) : (
                "운영기관"
              )}
              에서 확인하세요.
            </p>
          ) : null}
        </div>
      </Section>

      {/* 주변 시설 */}
      <Section id="nearby" title="주변 시설" desc="공통 ID가 없어 좌표 거리나 이름·주소로 연결했습니다. 휴양림 안의 시설인지는 확인이 필요합니다.">
        <div className="space-y-5">
          <Sub title="공중화장실 (휴양림 좌표 1.5km 이내)">
            {f.toilets.length ? (
              <>
                <ul className="divide-y divide-line">
                  {f.toilets.map((t, i) => (
                    <li key={i} className="py-2">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                        <strong className="font-semibold">{t.name}</strong>
                        <span className="text-sm text-muted">직선 {km(t.distKm)}</span>
                      </div>
                      <p className="text-sm">
                        장애인용 대변기 {t.disabled}개{t.disabledUrinal ? ` · 장애인용 소변기 ${t.disabledUrinal}개` : ""} · 어린이용
                        대변기 {t.child}개{t.openHours ? ` · 개방 ${t.openHours}` : ""}
                      </p>
                      <p className="text-xs text-muted">
                        {t.address} · 기준일 {t.refDate}
                      </p>
                    </li>
                  ))}
                </ul>
                <Src k="toilet" date="화장실별 표기" />
                <Note>기저귀 교환대 정보는 원본 데이터에 거의 없습니다.</Note>
              </>
            ) : (
              <p className="text-muted">공공데이터에 등록된 공중화장실이 1.5km 안에 없습니다.</p>
            )}
          </Sub>
          <Sub title="무장애나눔길 (3km 이내)">
            {f.nanum.length ? (
              <>
                <ul className="divide-y divide-line">
                  {f.nanum.map((x) => (
                    <li key={x.name + x.year} className="py-2">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                        <strong className="font-semibold">{x.name}</strong>
                        <span className="text-sm text-muted">직선 {km(x.distKm)}</span>
                      </div>
                      <p className="text-sm text-muted">
                        {x.lengthM ? `길이 ${x.lengthM.toLocaleString()}m · ` : ""}
                        {x.year}년 조성 · 관리 {x.org}
                      </p>
                    </li>
                  ))}
                </ul>
                <Src k="nanum" />
                <Note>경사·노면·폭 정보는 원본 데이터에 없습니다.</Note>
              </>
            ) : (
              <p className="text-muted">무장애나눔길 조성정보에 3km 안에 등록된 길이 없습니다.</p>
            )}
          </Sub>
          <PlaceBlock title="유아숲체험원" link={f.kidsPlaces} sigungu={f.sigungu} srcKey="kidsforest" />
          <PlaceBlock title="치유의숲" link={f.healingPlaces} sigungu={f.sigungu} srcKey="healing" />
          {f.survey && (
            <Sub title="현장조사 기록 (제주 무장애여행정보)">
              <ul className="divide-y divide-line">
                {f.survey.points.map((p, i) => (
                  <li key={i} className="py-2 text-sm">
                    <strong className="font-semibold">{p.place}</strong>
                    {p.detail && ` – ${p.detail}`}
                    {p.info && <span className="text-muted"> ({p.info})</span>}
                  </li>
                ))}
              </ul>
              <Src k="jeju" date={f.survey.refDate} />
            </Sub>
          )}
        </div>
      </Section>

      {/* 시설 관리: 안전점검·공사 이력 */}
      <Section
        id="manage"
        title="시설 관리 기록"
        desc="운영기관이 직접 기록한 안전점검과 공사 이력입니다. 시설의 현재 상태를 보증하지는 않습니다."
      >
        {f.safety || f.works ? (
          <div className="space-y-5">
            {f.safety && (
              <Sub title={`월별 안전점검 (최근 ${f.safety.lastDate.slice(0, 7)})`}>
                <ul className="divide-y divide-line">
                  {f.safety.items.map((s) => (
                    <li key={s.key} className="flex items-center justify-between gap-3 py-2 text-sm">
                      <span>{s.label}</span>
                      <span className={`tag ${RESULT_CLS[s.result] ?? ""}`}>{s.result}</span>
                    </li>
                  ))}
                </ul>
                <Src k="natsafety" note="운영기관 자체 점검" />
                <Note>경사로·장애인 객실·장애인 화장실 상태는 점검 항목에 없습니다.</Note>
              </Sub>
            )}
            {f.works && (
              <Sub title={`최근 공사 (${Number(f.works.lastYear) - 2}~${f.works.lastYear}년 ${f.works.recentCount}건)`}>
                {f.works.items.length ? (
                  <ul className="divide-y divide-line">
                    {f.works.items.map((w, i) => (
                      <li key={i} className="flex flex-wrap items-baseline gap-x-2 py-2 text-sm">
                        <span className="tabular-nums text-muted">{w.done || w.year}</span>
                        <span className="min-w-0 flex-1">{w.title}</span>
                        {w.a11y && <span className="tag tag-brand">동선 관련</span>}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted">최근 3년 공사 기록이 없습니다.</p>
                )}
                <Src k="natworks" note={`전체 ${f.works.total}건`} />
                <Note>&lsquo;동선 관련&rsquo;은 공사명에 데크로드·계단·화장실·출입문 같은 단어가 있다는 뜻입니다.</Note>
              </Sub>
            )}
          </div>
        ) : (
          <p className="text-muted">안전점검·공사 이력은 국립자연휴양림만 공공데이터로 공개되어 있습니다.</p>
        )}
      </Section>

      <Section id="sources" title="이 페이지의 데이터 출처">
        <ul className="space-y-1.5 text-sm">
          {[...new Set(f.sources)].map((s) => (
            <li key={s} className="flex flex-wrap gap-x-2">
              <a href={SOURCES[s].url} target="_blank" rel="noreferrer" className="font-medium underline underline-offset-2">
                {SOURCES[s].name}
              </a>
              <span className="text-muted">
                {SOURCES[s].org}
                {s === "std" ? ` · 기준일 ${f.refDate}` : s === "jeju" ? ` · 기준일 ${f.survey?.refDate}` : SOURCES[s].refDate ? ` · 기준일 ${SOURCES[s].refDate}` : ""}
              </span>
            </li>
          ))}
        </ul>
        {f.duplicates && (
          <Note>표준데이터에 같은 휴양림이 {f.duplicates.length + 1}건 등록되어 있어 기준일이 가장 최신인 레코드를 사용했습니다.</Note>
        )}
        <p className="mt-3 text-sm">
          <Link href="/data" className="font-medium text-brand-strong underline underline-offset-2">
            데이터 출처와 가공 방법 전체 보기
          </Link>
        </p>
      </Section>
    </article>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface-2 p-3">
      <p className="text-xs text-muted">{label}</p>
      <p className="text-xl font-bold tabular-nums">{value}</p>
    </div>
  );
}

function MonthlyBars({ data }: { data: { m: string; rate: number }[] }) {
  const max = Math.max(...data.map((d) => d.rate), 1);
  return (
    <figure className="mt-3">
      <figcaption className="mb-1 text-xs text-muted">월별 주말 추첨 경쟁률 (: 1)</figcaption>
      <ol className="flex h-28 items-end gap-1" aria-label="월별 경쟁률">
        {data.map((d) => (
          <li key={d.m} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
            <span className="text-[0.65rem] tabular-nums text-muted">{Math.round(d.rate)}</span>
            <span
              className="w-full max-w-6 rounded-t bg-[var(--brand)]/80"
              style={{ height: `${Math.max(4, (d.rate / max) * 100)}%` }}
              aria-label={`${d.m} ${d.rate} 대 1`}
              role="img"
            />
            <span className="text-[0.65rem] tabular-nums text-muted">{Number(d.m.slice(5))}</span>
          </li>
        ))}
      </ol>
    </figure>
  );
}

function PlaceBlock({ title, link, sigungu, srcKey }: { title: string; link?: PlaceLink; sigungu: string; srcKey: string }) {
  if (!link) return null;
  const row = (p: Place) => (
    <li key={p.name + p.address} className="py-2 text-sm">
      <strong className="font-semibold">{p.name}</strong>
      <span className="block text-muted">
        {p.address}
        {p.tel ? ` · ${p.tel}` : ""}
      </span>
    </li>
  );
  return (
    <Sub title={title}>
      {link.inside.length > 0 && (
        <>
          <p className="text-sm font-medium">이름에 이 휴양림 이름이 들어간 곳</p>
          <ul className="divide-y divide-line">{link.inside.map(row)}</ul>
        </>
      )}
      {link.sameAreaCount > 0 && (
        <details className="mt-1">
          <summary className="inline-flex min-h-10 cursor-pointer items-center text-sm font-medium text-brand-strong">
            같은 {sigungu}의 {title} {link.sameAreaCount}곳
          </summary>
          <ul className="divide-y divide-line">{link.sameArea.map(row)}</ul>
          {link.sameAreaCount > link.sameArea.length && <Note>그 밖에 {link.sameAreaCount - link.sameArea.length}곳 더 있습니다.</Note>}
        </details>
      )}
      <Src k={srcKey} note="주소만 있어 이름·시군구로 연결" />
    </Sub>
  );
}
