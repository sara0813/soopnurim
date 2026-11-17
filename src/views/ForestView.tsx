import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarCheck, ChevronLeft, ExternalLink, Globe, Phone } from "lucide-react";
import { bookingLink } from "@/lib/booking";
import JourneyView from "@/components/JourneyView";
import MapAppMenu from "@/components/MapAppMenu";
import RoomList from "@/components/RoomList";
import ForeignGuide from "@/components/ForeignGuide";
import OpenOnHash from "@/components/OpenOnHash";
import { Fold, Note, Src, Sub } from "@/components/Section";
import { CORE_KEYS, SOURCES, buildJourney, getForest, lotteryOf, sourceName } from "@/lib/journey";
import { fixedEn, href, kmOf, pick, type Lang } from "@/lib/i18n";
import { addressEn, nameOf, placeEn, regionOf } from "@/lib/romanize";
import type { Place, PlaceLink } from "@/lib/types";

const RESULT_CLS: Record<string, string> = { 예: "tag-brand", 아니오: "tag-no", 해당없음: "" };

export function forestTitle(id: string, lang: Lang) {
  const f = getForest(id);
  if (!f) return lang === "en" ? "Forest" : "숲 정보";
  return lang === "en" ? nameOf("en", f.name) : `${f.name} 정보`;
}

export default function ForestView({ id, lang }: { id: string; lang: Lang }) {
  const f = getForest(id);
  if (!f) notFound();
  const t = pick(lang);
  const en = lang === "en";
  const km = (d: number) => kmOf(lang, d);
  const items = buildJourney(f, lang);
  const n = f.national;
  const lot = lotteryOf(f);
  const telHref = f.tel ? `tel:${f.tel.replace(/[^0-9+]/g, "")}` : "";
  const isNational = !!n || f.ownership === "국유림";
  const book = bookingLink(f.homepage, isNational);
  const b = f.booking;
  const name = nameOf(lang, f.name);
  const foresttripName = t("숲나들e", "Foresttrip (숲나들e)");

  // 접힌 카드에 보일 한 줄 요약 (없는 정보는 '없음'이라 하지 않고 어디서 확인하는지 적는다)
  const join = (xs: (string | false | null | undefined)[]) => xs.filter(Boolean).join(" · ");
  const meta = {
    info:
      join([
        f.intro?.hours && t(`운영 ${f.intro.hours}`, `Hours ${f.intro.hours}`),
        f.admissionFee && t("입장료 있음", "Admission fee"),
        f.facilities.length > 0 && t(`주요 시설 ${f.facilities.length}종`, `${f.facilities.length} facilities`),
        f.capacity != null && t(`수용 ${f.capacity.toLocaleString()}명`, `capacity ${f.capacity.toLocaleString()}`),
      ]) || t("운영기관·숙박 여부", "Operator, lodging"),
    rooms: n?.roomList.length
      ? t(`객실 ${n.rooms}실 · 객실별 설명과 키워드`, `${n.rooms} rooms · descriptions and keywords`)
      : t("객실별 데이터는 국립만 공개돼요", "Room data is only published for national forests"),
    booking:
      join([
        lot && lot.disabled.count > 0 && t(`장애인 추첨 ${lot.disabled.count}실`, `${lot.disabled.count} disabled-lottery rooms`),
        b?.lottery?.avgRate != null && t(`주말 추첨 평균 ${b.lottery.avgRate} : 1`, `weekend lottery ${b.lottery.avgRate} : 1`),
        !!f.discounts?.length && t(`할인 대상 ${f.discounts.length}개`, `${f.discounts.length} discount groups`),
      ]) || t("우선예약·할인은 운영기관에서 확인", "Check priority booking and discounts with the operator"),
    foreign: join([
      t("가입·결제·신분증·언어", "Sign-up, payment, ID, language"),
      t("대중교통", "transit"),
      f.asean && t("아세안 우선예약", "ASEAN priority"),
    ]),
    nearby: f.lat
      ? join([
          t(`공중화장실 ${f.toilets.length}곳`, `${f.toilets.length} public toilets`),
          t(`무장애나눔길 ${f.nanum.length}곳`, `${f.nanum.length} barrier-free trails`),
        ])
      : t("좌표가 없어 거리 정보가 없어요", "No coordinates, so no distances"),
    manage:
      f.safety || f.works
        ? join([
            f.safety && t(`안전점검 ${f.safety.lastDate.slice(0, 7)}`, `safety check ${f.safety.lastDate.slice(0, 7)}`),
            f.works && t(`최근 3년 공사 ${f.works.recentCount}건`, `${f.works.recentCount} works in 3 years`),
          ])
        : t("국립만 공개돼요", "Only published for national forests"),
    sources: t(`데이터 ${new Set(f.sources).size}종 · 기준일`, `${new Set(f.sources).size} datasets · dates`),
  };

  const foreign = (
    <Fold id="foreign" title={t("외국인 이용 안내", "Guide for foreign visitors")} meta={meta.foreign} open={en}>
      <p className="mb-4 text-sm text-muted">
        {t(
          "확인된 정보만 '확인됨'으로 표시하고, 공식 안내가 없는 내용은 '운영기관 확인 필요'로 남겨 두었어요.",
          "Only sourced facts are marked Verified. Anything without an official source is marked 'Check with operator'.",
        )}
      </p>
      <ForeignGuide f={f} items={items} lang={lang} />
    </Fold>
  );

  return (
    <article className="space-y-5">
      <Link href={href(lang, "/")} className="-ml-1 inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-muted hover:text-fg">
        <ChevronLeft aria-hidden="true" className="size-4" /> {t("숲 목록", "All forests")}
      </Link>

      <header className="card space-y-3 p-4 sm:p-6">
        <div className="flex flex-wrap gap-1">
          {f.ownership && <span className={`tag ${f.ownership === "국유림" ? "tag-brand" : ""}`}>{fixedEn(lang, f.ownership)}</span>}
          {f.closed && <span className="tag tag-no">{f.notOpen ? t("미운영", "Not operating") : t("휴장", "Closed")}</span>}
          <span className="tag">{regionOf(lang, f.sido, f.sigungu)}</span>
        </div>
        <h1 className="text-[1.7rem] font-bold sm:text-3xl">{name}</h1>
        {en && (
          <p lang="ko" className="-mt-1 text-muted">
            {f.name}
          </p>
        )}
        {f.intro?.desc && (
          <p className="text-muted" lang="ko">
            {f.intro.desc}
            {en && <span lang="en"> (Korean original)</span>}
          </p>
        )}
        <p className="text-sm">
          {en ? (
            <>
              {addressEn(f.address)}
              <span lang="ko" className="block text-muted">
                {f.address}
              </span>
            </>
          ) : (
            f.address
          )}
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          {book?.foresttrip && (
            <a href={book.url} target="_blank" rel="noreferrer" className="btn btn-primary">
              <CalendarCheck aria-hidden="true" className="size-4" /> {t("숲나들e에서 예약하기", "Book on Foresttrip")}
              <ExternalLink aria-hidden="true" className="size-3.5 opacity-80" />
              <span className="sr-only">{t("(새 창)", "(new window, Korean site)")}</span>
            </a>
          )}
          {f.tel && (
            <a href={telHref} className={`btn ${book?.foresttrip ? "btn-outline" : "btn-primary"}`}>
              <Phone aria-hidden="true" className="size-4" /> {f.tel}
            </a>
          )}
          {book && !book.foresttrip && (
            <a href={book.url} target="_blank" rel="noreferrer" className="btn btn-outline">
              <Globe aria-hidden="true" className="size-4" /> {t("홈페이지에서 예약 확인", "Booking on website")}
              <span className="sr-only">{t("(새 창)", "(new window)")}</span>
            </a>
          )}
          {f.lat && f.lng && <MapAppMenu name={f.name} lat={f.lat} lng={f.lng} />}
        </div>
        {en && book?.foresttrip && <p className="text-xs text-muted">Foresttrip is the Korea Forest Service booking site, in Korean.</p>}
        {f.listOnly && (
          <p className="rounded-lg bg-surface-2 px-3 py-2 text-sm text-muted">
            {t(
              "공식 목록에만 있는 휴양림이라 이름·주소·전화만 있고 시설 정보는 대부분 빈칸이에요.",
              "Only the name, address and phone are known from the official list; most facility items are blank.",
            )}
          </p>
        )}
      </header>

      <OpenOnHash />

      {en && foreign}

      {/* 여정 체크 + 질문 + 제보: 이 페이지의 중심 */}
      <section id="journey" aria-labelledby="journey-h" className="scroll-mt-4">
        <header className="mb-3">
          <h2 id="journey-h" className="text-xl font-bold">
            {t("여정 단계별 체크", "Journey check, step by step")}
          </h2>
          <p className="mt-0.5 text-sm text-muted">
            {t(
              "단계를 누르면 확인된 정보와 빈칸이 나와요. 빈칸은 아래에서 전화로 물어볼 질문이 돼요.",
              "Tap a step to see what is known and what is not. 'Not verified' means no source was found, not that the facility is missing.",
            )}
          </p>
        </header>
        <JourneyView items={items} tel={f.tel} forestId={f.id} forestName={f.name} coreKeys={CORE_KEYS} />
      </section>

      <div className="space-y-2.5">
        <p className="px-1 pt-2 text-sm font-semibold text-muted">{t("더 자세한 정보", "More details")}</p>

      {/* 기본 정보 */}
      <Fold id="info" title={t("기본 정보", "Basic information")} meta={meta.info}>
        <dl className="kv">
          <dt>{t("운영", "Operator")}</dt>
          <dd lang="ko">{f.institution || "–"}</dd>
          <dt>{t("숙박", "Stay")}</dt>
          <dd>
            {f.stay === true
              ? n
                ? t(`가능 · 객실 ${n.rooms}실, 야영 ${n.camps}면`, `Yes · ${n.rooms} rooms, ${n.camps} campsites`)
                : t("가능", "Yes")
              : f.stay === false
                ? t("숙박시설 없음", "No lodging")
                : t("정보 없음", "No information")}
          </dd>
          {f.intro?.hours && (
            <>
              <dt>{t("운영 시간", "Hours")}</dt>
              <dd>{f.intro.hours}</dd>
            </>
          )}
          {f.capacity != null && (
            <>
              <dt>{t("수용 인원", "Capacity")}</dt>
              <dd>{t(`${f.capacity.toLocaleString()}명`, `${f.capacity.toLocaleString()} people`)}</dd>
            </>
          )}
          {f.intro?.builtYear && (
            <>
              <dt>{t("조성 연도", "Opened")}</dt>
              <dd>{t(`${f.intro.builtYear}년`, f.intro.builtYear)}</dd>
            </>
          )}
          {f.areaM2 != null && (
            <>
              <dt>{t("면적", "Area")}</dt>
              <dd>{Math.round(f.areaM2).toLocaleString()}㎡</dd>
            </>
          )}
          {f.admissionFee && (
            <>
              <dt>{t("입장료", "Admission")}</dt>
              <dd lang="ko">
                {f.admissionFee.replace(/\+/g, ", ")}
                {en && <span lang="en"> (Korean original)</span>}
              </dd>
            </>
          )}
          {f.facilities.length > 0 && (
            <>
              <dt>{t("주요 시설", "Facilities")}</dt>
              <dd lang="ko">
                {f.facilities.join(", ")}
                {en && <span lang="en"> (Korean original)</span>}
              </dd>
            </>
          )}
          {!f.tel && (
            <>
              <dt>{t("연락처", "Phone")}</dt>
              <dd>{t("공공데이터에 없음", "Not in public data")}</dd>
            </>
          )}
        </dl>
        {f.layoutMap && (
          <a href={f.layoutMap} target="_blank" rel="noreferrer" className="btn btn-outline mt-4 w-full sm:w-auto">
            {t("휴양림 전체 배치도 보기", "View site map")} <ExternalLink aria-hidden="true" className="size-4" />
          </a>
        )}
        {f.sources.includes("std") ? (
          <Src k="std" date={f.refDate} lang={lang} />
        ) : f.listOnly ? (
          <Src k={f.sources[0]} lang={lang} />
        ) : (
          <Src k="natfac" lang={lang} />
        )}
        {f.intro && <Src k="natintro" lang={lang} note={t("소개·운영시간·조성연도", "intro, hours, year opened")} />}
        {f.layoutMap && <Src k="natlayout" lang={lang} note={t("배치도 이미지는 숲나들e 서버에 있습니다", "map image is hosted on Foresttrip")} />}
        {f.telSource === "natpolicy" && (
          <Note>{t("연락처는 국립자연휴양림 예약정책 데이터에서 가져왔어요.", "Phone number comes from the national forest booking policy data.")}</Note>
        )}
      </Fold>

      {/* 객실 */}
      <Fold id="rooms" title={t("객실", "Rooms")} meta={meta.rooms}>
        {n && n.roomList.length ? (
          <>
            <RoomList rooms={n.roomList} />
            <Src k="natfac" lang={lang} />
            {lot && <Src k="natpolicy" lang={lang} note={t("객실별 추첨제 대상", "lottery rooms")} />}
            <Note>
              {t(
                "'언급'은 객실 설명 원문에 그 단어가 있다는 뜻입니다. 문턱·문 폭·욕실 구조는 데이터에 없습니다.",
                "'Mentioned' means the word appears in the room description. Thresholds, door widths and bathroom layout are not in the data.",
              )}
            </Note>
          </>
        ) : (
          <p className="text-muted">
            {t(
              "객실별 상세 데이터는 국립자연휴양림만 공개되어 있습니다. 이 휴양림의 객실 정보는 ",
              "Room-level data is only published for national forests. Check rooms on ",
            )}
            {book ? (
              <a href={book.url} className="underline" target="_blank" rel="noreferrer">
                {book.foresttrip ? foresttripName : t("홈페이지", "the website")}
              </a>
            ) : (
              t("운영기관", "with the operator")
            )}
            {t("에서 확인해 주세요.", ".")}
          </p>
        )}
      </Fold>

      {/* 예약·할인 */}
      <Fold id="booking" title={t("예약·할인", "Booking and discounts")} meta={meta.booking}>
        <div className="space-y-5">
          {lot ? (
            <Sub title={t("우선·추첨 예약 객실", "Priority and lottery rooms")}>
              <ul className="grid gap-2 sm:grid-cols-3">
                {(
                  [
                    ["disabled", t("장애인 추첨제", "Disabled lottery"), t("등록 장애인 회원 대상 추첨", "For registered disabled members")],
                    ["multiChild", t("다자녀 추첨제", "Large-family lottery"), t("다자녀 가정 대상 추첨", "For families with many children")],
                    ["voucher", t("산림복지 바우처 우선예약", "Forest welfare voucher"), t("산림복지서비스이용권 소지자", "For voucher holders")],
                  ] as const
                ).map(([k, label, desc]) => {
                  const L = lot[k];
                  return (
                    <li key={k} className="rounded-xl border border-line bg-surface-2 p-3">
                      <p className="text-sm text-muted">{label}</p>
                      <p className="text-xl font-bold tabular-nums">{t(`${L.count}실`, `${L.count} ${L.count === 1 ? "room" : "rooms"}`)}</p>
                      <p className="text-xs text-muted">{desc}</p>
                      {L.count > 0 && (
                        <details className="mt-1 text-sm">
                          <summary className="cursor-pointer py-1 font-medium text-brand-strong">{t("객실 이름", "Room names")}</summary>
                          <p lang="ko">{L.rooms.join(", ")}</p>
                          {L.months.length > 0 && (
                            <p className="text-xs text-muted">
                              {t("데이터상 대상 기간", "Period in data")} {L.months[0]} ~ {L.months[1]}
                            </p>
                          )}
                        </details>
                      )}
                    </li>
                  );
                })}
              </ul>
              <Src k="natpolicy" lang={lang} />
              {f.asean && (
                <Note>
                  <a href="#foreign" className="underline underline-offset-2">
                    {t("아세안 우선예약은 '외국인 이용 안내'에 있어요.", "ASEAN priority booking is in the visitor guide.")}
                  </a>
                </Note>
              )}
            </Sub>
          ) : null}

          {f.discounts?.length ? (
            <Sub title={t("이용료 할인 (객실 시설 사용료)", "Discounts (room fee)")}>
              <div className="-mx-1 overflow-x-auto px-1">
                <table className="w-full min-w-[30rem] text-sm">
                  <caption className="sr-only">{t("할인 대상별 할인율", "Discount rate by group")}</caption>
                  <thead>
                    <tr className="border-b border-line text-left text-muted">
                      <th scope="col" className="py-2 pr-2 font-medium">
                        {t("대상", "Group")}
                      </th>
                      <th scope="col" className="px-2 py-2 text-right font-medium">
                        {t("비수기 평일", "Off-season weekday")}
                      </th>
                      <th scope="col" className="px-2 py-2 text-right font-medium">
                        {t("비수기 주말", "Off-season weekend")}
                      </th>
                      <th scope="col" className="px-2 py-2 text-right font-medium">
                        {t("성수기 평일", "Peak weekday")}
                      </th>
                      <th scope="col" className="py-2 pl-2 text-right font-medium">
                        {t("성수기 주말", "Peak weekend")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="tabular-nums">
                    {f.discounts.map((d) => (
                      <tr key={d.target} className="border-b border-line last:border-0">
                        <th scope="row" className="py-2 pr-2 text-left font-semibold">
                          {fixedEn(lang, d.target)}
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
              <Src k="natdiscount" lang={lang} />
              <Note>
                {t(
                  "할인 자격·증빙 서류는 숲나들e에서 확인하세요.",
                  "These discounts are for Korean residents' categories; check eligibility and documents on Foresttrip.",
                )}
              </Note>
            </Sub>
          ) : null}

          {b ? (
            <Sub title={t("예약 경쟁", "How hard it is to book")}>
              <div className="grid gap-2 sm:grid-cols-3">
                {b.lottery?.avgRate != null && (
                  <Stat
                    label={t(`주말 추첨 평균 경쟁률 (${b.lottery.from} ~ ${b.lottery.to})`, `Average weekend lottery ratio (${b.lottery.from} – ${b.lottery.to})`)}
                    value={`${b.lottery.avgRate} : 1`}
                  />
                )}
                {b.lottery && b.lottery.peakRate > 0 && (
                  <Stat
                    label={t("경쟁률이 가장 높았던 달", "Most competitive month")}
                    value={t(`${b.lottery.peakMonth.slice(5)}월 · ${b.lottery.peakRate} : 1`, `${b.lottery.peakMonth} · ${b.lottery.peakRate} : 1`)}
                  />
                )}
                {b.occupancy?.weekend != null && (
                  <Stat label={t(`${b.occupancy.year}년 주말 객실 가동률`, `Weekend occupancy ${b.occupancy.year}`)} value={`${b.occupancy.weekend}%`} />
                )}
              </div>
              {b.lottery && b.lottery.peakRate > 0 && <MonthlyBars data={b.lottery.monthly} lang={lang} />}
              {b.lottery && !(b.lottery.peakRate > 0) && (
                <p className="text-sm text-muted">
                  {t(
                    "최근 12개월 주말 추첨 경쟁률이 모두 0으로 기록되어 있어 그래프를 생략했습니다.",
                    "Every month's weekend lottery ratio is recorded as 0 for the last 12 months, so the chart is omitted.",
                  )}
                </p>
              )}
              {b.lottery && <Src k="natcompetition" lang={lang} note={t("최근 12개월 신청자 합 ÷ 당첨자 합", "applicants ÷ winners, last 12 months")} />}
              {b.occupancy && <Src k="natoccupancy" lang={lang} note={b.occupancy.year} />}
            </Sub>
          ) : null}

          {f.closures?.count ? (
            <Sub title={t("이용불가·위약금 면제 기록", "Past closures and fee waivers")}>
              <ul className="space-y-1 text-sm">
                {f.closures.items.map((c) => (
                  <li key={c.from + c.title} className="flex flex-wrap gap-x-2">
                    <span className="tabular-nums text-muted">
                      {c.from} ~ {c.to}
                    </span>
                    <span>{fixedEn(lang, c.title)}</span>
                  </li>
                ))}
              </ul>
              <Src
                k="natclosure"
                lang={lang}
                note={t(`전체 ${f.closures.count}건 중 최근 ${f.closures.items.length}건`, `latest ${f.closures.items.length} of ${f.closures.count}`)}
              />
              <Note>{t("기상특보 등으로 이용이 막혔던 기록이에요.", "Times the forest could not be used, e.g. due to weather warnings.")}</Note>
            </Sub>
          ) : null}

          {isNational ? (
            <p className="text-sm text-muted">
              {t("실제 신청 일정과 자격은 ", "Check actual schedules and eligibility on ")}
              <a href={book?.foresttrip ? book.url : "https://www.foresttrip.go.kr"} target="_blank" rel="noreferrer" className="underline underline-offset-2">
                {t("숲나들e(국립자연휴양림 예약)", "Foresttrip (national forest booking)")}
              </a>
              {t(
                "에서 확인하세요. 데이터 기준일 이후 정책이 바뀌었을 수 있습니다.",
                ". Policies may have changed since the data date.",
              )}
            </p>
          ) : !lot && !f.discounts?.length ? (
            <p className="text-muted">
              {t(
                "우선·추첨 예약과 할인 정책은 국립자연휴양림만 공공데이터로 공개되어 있습니다. 이 휴양림은 ",
                "Priority, lottery and discount policies are only published for national forests. For this forest, check ",
              )}
              {book ? (
                <a href={book.url} className="underline" target="_blank" rel="noreferrer">
                  {book.foresttrip ? foresttripName : t("홈페이지", "the website")}
                </a>
              ) : (
                t("운영기관", "with the operator")
              )}
              {t("에서 확인하세요.", ".")}
            </p>
          ) : null}
        </div>
      </Fold>

      {!en && foreign}

      {/* 주변 시설 */}
      <Fold id="nearby" title={t("주변 시설", "Nearby")} meta={meta.nearby}>
        <p className="mb-4 text-sm text-muted">
          {t(
            "공통 ID가 없어 좌표 거리나 이름·주소로 연결했어요. 휴양림 안의 시설인지는 확인이 필요해요.",
            "Linked by distance or by name and address, since there is no shared ID. Whether a place is inside the forest needs checking.",
          )}
        </p>
        <div className="space-y-5">
          <Sub title={t("공중화장실 (휴양림 좌표 1.5km 이내)", "Public toilets (within 1.5 km)")}>
            {f.toilets.length ? (
              <>
                <ul className="divide-y divide-line">
                  {f.toilets.map((x, i) => (
                    <li key={i} className="py-2">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                        <strong lang="ko" className="font-semibold">
                          {x.name}
                        </strong>
                        <span className="text-sm text-muted">
                          {t("직선", "straight line")} {km(x.distKm)}
                        </span>
                      </div>
                      <p className="text-sm">
                        {t(
                          `장애인용 대변기 ${x.disabled}개${x.disabledUrinal ? ` · 장애인용 소변기 ${x.disabledUrinal}개` : ""} · 어린이용 대변기 ${x.child}개${x.openHours ? ` · 개방 ${x.openHours}` : ""}`,
                          `Accessible toilets ${x.disabled}${x.disabledUrinal ? ` · accessible urinals ${x.disabledUrinal}` : ""} · children's toilets ${x.child}${x.openHours ? ` · open ${x.openHours}` : ""}`,
                        )}
                      </p>
                      <p className="text-xs text-muted">
                        <span lang="ko">{x.address}</span> · {t("기준일", "as of")} {x.refDate}
                      </p>
                    </li>
                  ))}
                </ul>
                <Src k="toilet" lang={lang} date={t("화장실별 표기", "per toilet")} />
                <Note>{t("기저귀 교환대 정보는 원본 데이터에 거의 없습니다.", "Diaper station data is almost never filled in.")}</Note>
              </>
            ) : (
              <p className="text-muted">
                {t("공공데이터에 등록된 공중화장실이 1.5km 안에 없습니다.", "No public toilet registered within 1.5 km.")}
              </p>
            )}
          </Sub>
          <Sub title={t("무장애나눔길 (3km 이내)", "Barrier-free trails (within 3 km)")}>
            {f.nanum.length ? (
              <>
                <ul className="divide-y divide-line">
                  {f.nanum.map((x) => (
                    <li key={x.name + x.year} className="py-2">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                        <strong lang="ko" className="font-semibold">
                          {x.name}
                        </strong>
                        <span className="text-sm text-muted">
                          {t("직선", "straight line")} {km(x.distKm)}
                        </span>
                      </div>
                      <p className="text-sm text-muted">
                        {x.lengthM ? t(`길이 ${x.lengthM.toLocaleString()}m · `, `${x.lengthM.toLocaleString()} m · `) : ""}
                        {t(`${x.year}년 조성`, `built ${x.year}`)} · {t("관리", "managed by")} <span lang="ko">{x.org}</span>
                      </p>
                    </li>
                  ))}
                </ul>
                <Src k="nanum" lang={lang} />
                <Note>{t("경사·노면·폭 정보는 원본 데이터에 없습니다.", "Slope, surface and width are not in the data.")}</Note>
              </>
            ) : (
              <p className="text-muted">
                {t("무장애나눔길 조성정보에 3km 안에 등록된 길이 없습니다.", "No barrier-free trail registered within 3 km.")}
              </p>
            )}
          </Sub>
          <PlaceBlock title={t("유아숲체험원", "Children's forest centers")} link={f.kidsPlaces} sigungu={f.sigungu} srcKey="kidsforest" lang={lang} />
          <PlaceBlock title={t("치유의숲", "Healing forests")} link={f.healingPlaces} sigungu={f.sigungu} srcKey="healing" lang={lang} />
          {f.survey && (
            <Sub title={t("현장조사 기록 (제주 무장애여행정보)", "Field survey (Jeju barrier-free travel)")}>
              <ul className="divide-y divide-line" lang="ko">
                {f.survey.points.map((p, i) => (
                  <li key={i} className="py-2 text-sm">
                    <strong className="font-semibold">{p.place}</strong>
                    {p.detail && ` – ${p.detail}`}
                    {p.info && <span className="text-muted"> ({p.info})</span>}
                  </li>
                ))}
              </ul>
              {en && <Note>Korean original.</Note>}
              <Src k="jeju" lang={lang} date={f.survey.refDate} />
            </Sub>
          )}
        </div>
      </Fold>

      {/* 시설 관리: 안전점검·공사 이력 */}
      <Fold id="manage" title={t("시설 관리 기록", "Maintenance records")} meta={meta.manage}>
        {(f.safety || f.works) && (
          <p className="mb-4 text-sm text-muted">
            {t(
              "운영기관이 직접 기록한 안전점검과 공사 이력이에요. 시설의 현재 상태를 보증하지는 않아요.",
              "Safety checks and works recorded by the operator. They do not guarantee the current condition.",
            )}
          </p>
        )}
        {f.safety || f.works ? (
          <div className="space-y-5">
            {f.safety && (
              <Sub title={t(`월별 안전점검 (최근 ${f.safety.lastDate.slice(0, 7)})`, `Monthly safety check (latest ${f.safety.lastDate.slice(0, 7)})`)}>
                <ul className="divide-y divide-line">
                  {f.safety.items.map((s) => (
                    <li key={s.key} className="flex items-center justify-between gap-3 py-2 text-sm">
                      <span>{fixedEn(lang, s.label)}</span>
                      <span className={`tag ${RESULT_CLS[s.result] ?? ""}`}>{fixedEn(lang, s.result)}</span>
                    </li>
                  ))}
                </ul>
                <Src k="natsafety" lang={lang} note={t("운영기관 자체 점검", "operator's own check")} />
                <Note>
                  {t(
                    "경사로·장애인 객실·장애인 화장실 상태는 점검 항목에 없습니다.",
                    "Ramps, accessible rooms and accessible toilets are not check items.",
                  )}
                </Note>
              </Sub>
            )}
            {f.works && (
              <Sub
                title={t(
                  `최근 공사 (${Number(f.works.lastYear) - 2}~${f.works.lastYear}년 ${f.works.recentCount}건)`,
                  `Recent works (${Number(f.works.lastYear) - 2}–${f.works.lastYear}, ${f.works.recentCount})`,
                )}
              >
                {f.works.items.length ? (
                  <ul className="divide-y divide-line">
                    {f.works.items.map((w, i) => (
                      <li key={i} className="flex flex-wrap items-baseline gap-x-2 py-2 text-sm">
                        <span className="tabular-nums text-muted">{w.done || w.year}</span>
                        <span lang="ko" className="min-w-0 flex-1">
                          {w.title}
                        </span>
                        {w.a11y && <span className="tag tag-brand">{t("동선 관련", "Access-related")}</span>}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted">{t("최근 3년 공사 기록이 없습니다.", "No works in the last 3 years.")}</p>
                )}
                <Src k="natworks" lang={lang} note={t(`전체 ${f.works.total}건`, `${f.works.total} in total`)} />
                <Note>
                  {t(
                    "'동선 관련'은 공사명에 데크로드·계단·화장실·출입문 같은 단어가 있다는 뜻입니다.",
                    "'Access-related' means the work title mentions decks, stairs, toilets or doors. Titles are in Korean.",
                  )}
                </Note>
              </Sub>
            )}
          </div>
        ) : (
          <p className="text-muted">
            {t(
              "안전점검·공사 이력은 국립자연휴양림만 공공데이터로 공개되어 있습니다.",
              "Safety checks and works are only published for national forests.",
            )}
          </p>
        )}
      </Fold>

      <Fold id="sources" title={t("데이터 출처", "Data sources")} meta={meta.sources}>
        {(f.listOnly || f.notInStd) && (
          <p className="mb-3 rounded-lg bg-surface-2 px-3 py-2 text-sm text-muted">
            {f.listOnly
              ? t(
                  "전국휴양림표준데이터와 국립자연휴양림 데이터에 없는 휴양림이라 산림청·숲나들e 공식 목록의 이름·주소·전화를 썼어요. ",
                  "This forest is in neither the standard data nor the national forest data, so the name, address and phone come from the Korea Forest Service or Foresttrip list. ",
                ) +
                (f.lat == null
                  ? t("좌표를 찾지 못해 지도와 주변 거리 정보가 없어요.", "No coordinates were found, so there is no map or nearby distance.")
                  : f.geoSource === "osm"
                    ? t(
                        "지도 위치는 OpenStreetMap에서 이름·주소로 찾은 값이라 실제와 다를 수 있어요.",
                        "The map position was found by name or address on OpenStreetMap and may be off.",
                      )
                    : t("지도 위치는 숲나들e 찾아오시는 길 지도의 좌표예요.", "The map position is from the Foresttrip directions map."))
              : t(
                  "표준데이터에 없는 국립자연휴양림이라 국립자연휴양림관리소 데이터로 보여 드려요.",
                  "This national forest is missing from the standard data, so it is shown from National Forest Recreation Service data.",
                )}
          </p>
        )}
        <ul className="space-y-1.5 text-sm">
          {[...new Set(f.sources)].map((s) => (
            <li key={s} className="flex flex-wrap gap-x-2">
              <a href={SOURCES[s].url} target="_blank" rel="noreferrer" className="font-medium underline underline-offset-2">
                {sourceName(SOURCES[s], lang)}
              </a>
              <span className="text-muted">
                {en ? (SOURCES[s].org_en ?? SOURCES[s].org) : SOURCES[s].org}
                {s === "std"
                  ? ` · ${t("기준일", "as of")} ${f.refDate}`
                  : s === "jeju"
                    ? ` · ${t("기준일", "as of")} ${f.survey?.refDate}`
                    : SOURCES[s].refDate
                      ? ` · ${t("기준일", "as of")} ${SOURCES[s].refDate}`
                      : ""}
              </span>
            </li>
          ))}
        </ul>
        {f.duplicates && (
          <Note>
            {t(
              `표준데이터에 같은 곳이 ${f.duplicates.length + 1}건 있어 가장 최신 기록을 썼어요.`,
              `The standard data lists this place ${f.duplicates.length + 1} times; the newest record is used.`,
            )}
          </Note>
        )}
        <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5 border-t border-line pt-3 text-xs text-muted">
          <span className="font-semibold">{t("출처 표시", "Source labels")}</span>
          <span className="src src-public">{t("공공데이터", "Public data")}</span>
          <span className="src src-operator">{t("운영자 확인", "Operator checked")}</span>
          <span className="src src-user">{t("이용자 제보", "Visitor report")}</span>
          <span className="src src-web">{t("온라인 자료 참고", "Online reference")}</span>
        </div>
        <p className="mt-3 text-sm">
          <Link href={href(lang, "/data")} className="font-medium text-brand-strong underline underline-offset-2">
            {t("데이터 출처와 가공 방법 전체 보기", "All data sources and processing")}
          </Link>
        </p>
      </Fold>
      </div>
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

function MonthlyBars({ data, lang }: { data: { m: string; rate: number }[]; lang: Lang }) {
  const t = pick(lang);
  const max = Math.max(...data.map((d) => d.rate), 1);
  return (
    <figure className="mt-3">
      <figcaption className="mb-1 text-xs text-muted">{t("월별 주말 추첨 경쟁률 (: 1)", "Weekend lottery ratio by month (: 1)")}</figcaption>
      <ol className="flex h-28 items-end gap-1" aria-label={t("월별 경쟁률", "Ratio by month")}>
        {data.map((d) => (
          <li key={d.m} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
            <span className="text-[0.65rem] tabular-nums text-muted">{Math.round(d.rate)}</span>
            <span
              className="w-full max-w-6 rounded-t bg-[var(--brand)]/80"
              style={{ height: `${Math.max(4, (d.rate / max) * 100)}%` }}
              aria-label={t(`${d.m} ${d.rate} 대 1`, `${d.m}: ${d.rate} to 1`)}
              role="img"
            />
            <span className="text-[0.65rem] tabular-nums text-muted">{Number(d.m.slice(5))}</span>
          </li>
        ))}
      </ol>
    </figure>
  );
}

function PlaceBlock({
  title,
  link,
  sigungu,
  srcKey,
  lang,
}: {
  title: string;
  link?: PlaceLink;
  sigungu: string;
  srcKey: string;
  lang: Lang;
}) {
  const t = pick(lang);
  if (!link) return null;
  const row = (p: Place) => (
    <li key={p.name + p.address} className="py-2 text-sm">
      <strong lang="ko" className="font-semibold">
        {p.name}
      </strong>
      <span className="block text-muted">
        <span lang="ko">{p.address}</span>
        {p.tel ? ` · ${p.tel}` : ""}
      </span>
    </li>
  );
  return (
    <Sub title={title}>
      {link.inside.length > 0 && (
        <>
          <p className="text-sm font-medium">{t("이름에 이 휴양림 이름이 들어간 곳", "Places whose name includes this forest's name")}</p>
          <ul className="divide-y divide-line">{link.inside.map(row)}</ul>
        </>
      )}
      {link.sameAreaCount > 0 && (
        <details className="mt-1">
          <summary className="inline-flex min-h-10 cursor-pointer items-center text-sm font-medium text-brand-strong">
            {t(`같은 ${sigungu}의 ${title} ${link.sameAreaCount}곳`, `${link.sameAreaCount} in ${placeEn(sigungu)}`)}
          </summary>
          <ul className="divide-y divide-line">{link.sameArea.map(row)}</ul>
          {link.sameAreaCount > link.sameArea.length && (
            <Note>
              {t(`그 밖에 ${link.sameAreaCount - link.sameArea.length}곳 더 있습니다.`, `${link.sameAreaCount - link.sameArea.length} more.`)}
            </Note>
          )}
        </details>
      )}
      <Src k={srcKey} lang={lang} note={t("주소만 있어 이름·시군구로 연결", "linked by name and city/county (no coordinates)")} />
    </Sub>
  );
}
