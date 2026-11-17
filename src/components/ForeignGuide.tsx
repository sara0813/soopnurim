import { Bus, CircleCheck, Info, TrainFront, CircleDashed, ExternalLink, Phone, TriangleAlert } from "lucide-react";
import type { Forest, JourneyItem } from "@/lib/types";
import { kmOf, pick, type Lang } from "@/lib/i18n";
import { romanize } from "@/lib/romanize";
import { Note, Src, Sub } from "./Section";

/** 숲나들e 국립아세안자연휴양림 '아세안우선예약정책' 안내 (운영기관 공개자료) */
const ASEAN_POLICY_URL = "https://www.foresttrip.go.kr/pot/rm/ug/selectRsrvtGdncView.do?hmpgId=0104&menuId=004001006&ruleId=106";
const ASEAN_CHECKED = "2026-11-17";
/** 아세안 회원국 10개국 (숲나들e 공식 안내 기준). 동티모르는 2025년 가입, 공식 대상 목록에는 아직 없음 */
const ASEAN10 = [
  ["브루나이", "Brunei"],
  ["캄보디아", "Cambodia"],
  ["인도네시아", "Indonesia"],
  ["라오스", "Laos"],
  ["말레이시아", "Malaysia"],
  ["미얀마", "Myanmar"],
  ["필리핀", "Philippines"],
  ["싱가포르", "Singapore"],
  ["태국", "Thailand"],
  ["베트남", "Viet Nam"],
] as const;

const ICON = { ok: CircleCheck, warn: TriangleAlert, no: CircleDashed, unknown: CircleDashed };

/**
 * 외국인 이용 안내: 예약 준비물(가입·결제·신분증·언어·연락처), 대중교통, 이용수칙, 아세안 우선예약.
 * 확인되지 않은 내용은 '이용 가능'이 아니라 '운영기관 확인 필요'로 표시한다.
 */
export default function ForeignGuide({ f, items, lang }: { f: Forest; items: JourneyItem[]; lang: Lang }) {
  const t = pick(lang);
  const en = lang === "en";
  const get = (k: string) => items.find((i) => i.key === k);
  const telHref = f.tel ? `tel:${f.tel.replace(/[^0-9+]/g, "")}` : "";
  const rows = ["fgSignup", "fgPayment", "fgCheckinId", "fgLanguage"].map(get).filter(Boolean) as JourneyItem[];
  const rules = ["checkinTime", "fireCooking", "emergency"].map(get).filter(Boolean) as JourneyItem[];
  const stops = f.busStops ?? [];
  const rail = f.rail;
  const ic = f.infoCenters ?? [];
  const a = f.asean;

  const Row = ({ it }: { it: JourneyItem }) => {
    const Icon = ICON[it.status];
    const known = it.status !== "unknown";
    return (
      <li className="py-2.5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <strong className="font-semibold">{it.label}</strong>
          <span className={`st st-${known ? it.status : "unknown"}`}>
            <Icon aria-hidden="true" className="size-4" strokeWidth={2.25} />
            {known
              ? it.status === "warn"
                ? t("추가 확인 필요", "Needs checking")
                : t("확인됨", "Verified")
              : t("운영기관 확인 필요", "Check with operator")}
          </span>
        </div>
        {it.value && <p className="mt-1 text-[0.95rem]">{it.value}</p>}
      </li>
    );
  };

  return (
    <div className="space-y-5">
      <Sub title={t("예약 전에 확인할 것", "Before you book")}>
        <ul className="divide-y divide-line">
          {rows.map((it) => (
            <Row key={it.key} it={it} />
          ))}
          <li className="py-2.5">
            <strong className="font-semibold">{t("문의 연락처", "Contact")}</strong>
            {f.tel ? (
              <p className="mt-1">
                <a href={telHref} className="inline-flex min-h-9 items-center gap-1.5 font-semibold text-brand-strong underline underline-offset-2">
                  <Phone aria-hidden="true" className="size-4" /> {f.tel}
                </a>
                {en && <span className="ml-2 text-sm text-muted">Answered in Korean. Korea Travel Hotline 1330 can interpret.</span>}
              </p>
            ) : (
              <p className="mt-1 text-sm text-muted">{t("공공데이터에 전화번호가 없어요.", "No phone number in public data.")}</p>
            )}
          </li>
        </ul>
        <p className="mt-2 text-sm">
          <a href="#ask" className="font-medium text-brand-strong underline underline-offset-2">
            {t("한국어로 물어볼 문장 보기", "See questions in Korean to ask the operator")}
          </a>
        </p>
      </Sub>

      <Sub title={t("대중교통", "Getting there without a car")}>
        {stops.length ? (
          <>
            <ul className="divide-y divide-line">
              {stops.map((s) => (
                <li key={s.name} className="flex flex-wrap items-baseline justify-between gap-x-3 py-2">
                  <span className="flex items-center gap-2">
                    <Bus aria-hidden="true" className="size-4 shrink-0 text-muted" />
                    <span>
                      <strong lang="ko" className="font-semibold">
                        {s.name}
                      </strong>
                      {en && <span className="ml-1.5 text-sm text-muted">{romanize(s.name)}</span>}
                    </span>
                  </span>
                  <span className="text-sm text-muted">
                    {t("직선", "straight line")} {kmOf(lang, s.distKm)}
                  </span>
                </li>
              ))}
            </ul>
            <Note>
              {stops[0].distKm > 1
                ? t(
                    "가장 가까운 정류장도 1km 넘게 떨어져 있어요. 실제 걷는 길은 더 길고 오르막일 수 있어 택시가 필요할 수 있어요.",
                    "Even the nearest stop is over 1 km away. The walking route is longer and may be uphill, so you may need a taxi.",
                  )
                : t(
                    "직선거리라 실제 걷는 길은 더 길어요. 버스 노선·배차는 데이터에 없어 지도 앱에서 확인하세요.",
                    "Straight-line distance; the walk is longer. Routes and timetables are not in the data, so check a map app.",
                  )}
            </Note>
          </>
        ) : (
          <p className="text-muted">
            {t(
              "이 데이터에서 3km 안 버스정류장을 찾지 못했어요 (일부 시·군은 데이터에 없음). 택시나 차량이 필요할 수 있어요.",
              "No bus stop within 3 km was found in this data (some cities and counties are not included). You may need a taxi or car.",
            )}
          </p>
        )}
        <Src k="busstop" lang={lang} />
        <ul className="mt-3 divide-y divide-line border-t border-line">
          <li className="py-2.5">
            <span className="flex items-center gap-2">
              <TrainFront aria-hidden="true" className="size-4 shrink-0 text-muted" />
              <strong className="font-semibold">{t("가까운 철도역", "Nearest train station")}</strong>
            </span>
            {rail ? (
              <p className="mt-1">
                <span lang="ko">{rail.name}</span>
                {t("역", "")}
                {en && <span className="ml-1.5 text-sm text-muted">{romanize(rail.name)} Station</span>}
                <span className="ml-2 text-sm text-muted">
                  {t("직선", "straight line")} {kmOf(lang, rail.distKm)}
                </span>
              </p>
            ) : (
              <p className="mt-1 text-sm text-muted">
                {t("30km 안에 한국철도공사 역이 없거나 휴양림 좌표가 없어요.", "No KORAIL station within 30 km, or the forest has no coordinates.")}
              </p>
            )}
            <p className="mt-1 text-sm text-muted">
              {t("이 역에 서는 열차와 역에서 휴양림까지 가는 방법은 데이터에 없어요.", "Which trains stop there and how to get from the station to the forest are not in the data.")}
            </p>
            <Src k="rail" lang={lang} />
          </li>
          <li className="py-2.5">
            <span className="flex items-center gap-2">
              <Info aria-hidden="true" className="size-4 shrink-0 text-muted" />
              <strong className="font-semibold">{t("관광안내소", "Tourist information center")}</strong>
            </span>
            {ic.length ? (
              <ul className="mt-1 space-y-1.5">
                {ic.map((c) => (
                  <li key={c.name}>
                    <span lang="ko" className="font-medium">{c.name}</span>
                    <span className="block text-sm text-muted">
                      {[
                        c.lang ? t(`제공 언어: ${c.lang}`, `Languages: ${c.lang}`) : t("제공 언어 정보 없음", "Languages not listed"),
                        c.hours,
                        c.off && t(`휴무 ${c.off}`, `Closed: ${c.off}`),
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                    {c.tel && (
                      <a href={`tel:${c.tel.split("~")[0].replace(/[^0-9]/g, "")}`} className="text-sm font-medium text-brand-strong underline underline-offset-2">
                        {c.tel}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-sm text-muted">
                {t(
                  "같은 읍·면의 관광안내소가 데이터에 없어요. 안내소 데이터에 좌표가 없어 더 넓게 찾을 수 없어요.",
                  "No tourist information center in the same town in the data. The center data has no coordinates, so we cannot search further.",
                )}
              </p>
            )}
            {en && <p className="mt-1 text-sm text-muted">Korea Travel Hotline 1330 answers in English, Japanese and Chinese, 24 hours.</p>}
            <Src k="touristinfo" lang={lang} />
          </li>
        </ul>
      </Sub>

      <Sub title={t("이용수칙과 긴급 연락처", "House rules and emergency numbers")}>
        <ul className="divide-y divide-line">
          {rules.map((it) => (
            <Row key={it.key} it={it} />
          ))}
        </ul>
        {f.national?.rules ? (
          <Src k="natfac" lang={lang} note={t("객실 설명 원문에서 추출", "extracted from room descriptions")} />
        ) : (
          <Note>
            {t(
              "입·퇴실 시간과 바비큐 규정은 국립자연휴양림만 공공데이터에 있어요. 이 휴양림은 운영기관에 확인하세요.",
              "Check-in times and barbecue rules are only in public data for national forests. Ask this operator.",
            )}
          </Note>
        )}
        <Note>
          {t(
            "현장 규정은 휴양림·시기마다 다를 수 있어요. 기준일 이후 바뀌었을 수 있으니 입실 전 안내를 따르세요.",
            "Rules differ by forest and season and may have changed since the date shown. Follow the on-site guidance.",
          )}
        </Note>
      </Sub>

      {a && (
        <Sub title={t("아세안 우선예약", "ASEAN priority booking")}>
          <div className="space-y-3">
            <dl className="kv text-sm">
              <dt>{t("대상", "Who")}</dt>
              <dd>
                {t(
                  "한국에 사는 아세안 회원국 출신 근로자·학생·다문화 가정. 관광객 대상이라는 안내는 없어요.",
                  "ASEAN nationals living in Korea: workers, students and multicultural families. The notice does not mention tourists.",
                )}
              </dd>
              <dt>{t("대상 국가", "Countries")}</dt>
              <dd>{ASEAN10.map(([ko, e]) => (en ? e : ko)).join(", ")}</dd>
              <dt>{t("신청", "How to apply")}</dt>
              <dd>
                {t(
                  "개인은 숲나들e 우선예약 메뉴에서 신청하고, 아세안 국가 출신임을 증명하는 서류를 메일·팩스 등으로 제출. 단체는 대사관이나 한-아세안센터를 통해 공문으로 접수.",
                  "Individuals apply in the Foresttrip priority-booking menu and send proof of ASEAN nationality by email or fax. Groups apply by official letter through an embassy or the ASEAN-Korea Centre.",
                )}
              </dd>
              <dt>{t("증빙 서류", "Documents")}</dt>
              <dd>
                <span className="st st-unknown">
                  <CircleDashed aria-hidden="true" className="size-4" strokeWidth={2.25} />
                  {t("운영기관 확인 필요", "Check with operator")}
                </span>{" "}
                {t("어떤 서류가 인정되는지는 공식 안내에 없어요.", "Which documents are accepted is not stated.")}
              </dd>
              <dt>{t("할인", "Discount")}</dt>
              <dd>
                <span className="st st-unknown">
                  <CircleDashed aria-hidden="true" className="size-4" strokeWidth={2.25} />
                  {t("운영기관 확인 필요", "Check with operator")}
                </span>{" "}
                {t(
                  "외국인 할인은 공식 안내에서 확인하지 못했어요. 숲나들e 자주 묻는 질문에 '2017년 1월부터 아세안 자연휴양림에 입장하는 외국인도 100% 결제' 항목이 있어요.",
                  "No foreigner discount was found in official notices. Foresttrip's FAQ has an entry saying foreign visitors to the ASEAN forest pay 100% since January 2017.",
                )}
              </dd>
              <dt>{t("남은 객실", "Unbooked rooms")}</dt>
              <dd>
                {t(
                  "우선예약 기간이 지나면 남은 객실은 누리집에서 선착순 일반 예약.",
                  "After the priority period, remaining rooms open to everyone, first come first served.",
                )}
              </dd>
            </dl>
            <p className="rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm">
              <strong className="font-semibold">{t("동티모르", "Timor-Leste")}</strong>{" "}
              <span className="st st-unknown ml-1 align-middle">
                <CircleDashed aria-hidden="true" className="size-4" strokeWidth={2.25} />
                {t("대상 여부 미확인", "Eligibility not verified")}
              </span>
              <span className="mt-1 block">
                {t(
                  "2025년 아세안 11번째 회원국이 되었지만, 확인한 숲나들e 공식 대상 목록(10개국)에는 아직 없어요. 신청 전 운영기관에 확인하세요.",
                  "It became ASEAN's 11th member in 2025 but is not in the official Foresttrip list of 10 countries we checked. Ask the operator before applying.",
                )}
              </span>
            </p>

            <div>
              <p className="mb-1 text-sm font-semibold">
                {t(
                  `우선예약 객실 ${a.rooms.length}실 (나라 이름 객실, ${a.countries.length}개국)`,
                  `${a.rooms.length} priority rooms (named after ${a.countries.length} countries)`,
                )}
              </p>
              <p className="text-sm">
                {a.countries.map((c) => (en ? c.en : c.ko)).join(", ")}
                {a.otherRooms.length > 0 &&
                  t(
                    `. ${a.otherRooms.join(", ")} 객실은 데이터상 우선예약 대상이 아니에요 (장애인 추첨제 객실).`,
                    `. The ${a.otherRooms.join(", ")} room is not a priority room in the data (it is a disabled-lottery room).`,
                  )}
              </p>
            </div>

            <div>
              <p className="mb-1 text-sm font-semibold">{t("신청 기간 (이용하려는 달의 전달 4~14일)", "Application windows (4th–14th of the previous month)")}</p>
              <div className="-mx-1 overflow-x-auto px-1">
                <table className="w-full min-w-[18rem] text-sm">
                  <caption className="sr-only">{t("월별 아세안 우선예약 신청 기간", "ASEAN priority application window by month")}</caption>
                  <thead>
                    <tr className="border-b border-line text-left text-muted">
                      <th scope="col" className="py-1.5 pr-2 font-medium">
                        {t("이용 월", "Stay month")}
                      </th>
                      <th scope="col" className="py-1.5 pl-2 font-medium">
                        {t("신청 기간", "Apply")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="tabular-nums">
                    {a.windows.map((w) => (
                      <tr key={w.month} className="border-b border-line last:border-0">
                        <th scope="row" className="py-1.5 pr-2 text-left font-semibold">
                          {w.month}
                        </th>
                        <td className="py-1.5 pl-2">
                          {w.applyFrom} ~ {w.applyTo}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <Src k="natpolicy" lang={lang} note={t("객실·신청 기간", "rooms and windows")} />
            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
              <span className="src src-web">{t("운영기관 공개자료", "Operator's published notice")}</span>
              <a href={ASEAN_POLICY_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 underline underline-offset-2">
                {t("숲나들e 아세안우선예약정책", "Foresttrip ASEAN priority booking policy")} <ExternalLink aria-hidden="true" className="size-3" />
              </a>
              <span>· {t(`확인 ${ASEAN_CHECKED}`, `checked ${ASEAN_CHECKED}`)}</span>
            </p>
          </div>
        </Sub>
      )}
    </div>
  );
}
