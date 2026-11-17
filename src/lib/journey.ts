/**
 * 산림공공데이터 → 여정 단계(1 예약 ~ 7 안전)별 확인 항목 변환.
 * 원칙: "이용 가능" 판정을 하지 않고, 항목별로 무엇이 확인됐고 무엇이 빈칸인지만 표시한다.
 *       데이터에 없다는 사실은 '없음'이 아니라 빈칸으로 둔다.
 * 문장은 한국어·영어를 함께 적는다. 영어 화면의 질문에는 전화로 그대로 쓸 한국어 원문(questionKo)을 붙인다.
 */
import raw from "@/data/forests.json";
import operatorRaw from "@/data/operator_checks.json";
import webRaw from "@/data/web_checks.json";
import type { Forest, ForestSummary, Group, JourneyItem, Lottery, SourceInfo, Status, WebNote } from "./types";
import { groupsMask } from "./groups";
import { kmOf, pick, type Lang } from "./i18n";
import { romanize } from "./romanize";

export const SOURCES = raw.sources as Record<string, SourceInfo>;
export const FORESTS = raw.forests as unknown as Forest[];
/** 공공데이터포털 데이터셋 수 (기관 누리집 공식 목록은 빼고 센다) */
export const DATASET_COUNT = Object.values(SOURCES).filter((s) => !s.notPortal).length;

type OperatorEntry = { checkedAt: string; items: Record<string, { status: Status; value: string; value_en?: string }> };
const OPERATOR = Object.fromEntries(
  Object.entries(operatorRaw as Record<string, unknown>).filter(([k]) => !k.startsWith("_")),
) as Record<string, OperatorEntry>;

const WEB = Object.fromEntries(
  Object.entries(webRaw as Record<string, unknown>).filter(([k]) => !k.startsWith("_")),
) as Record<string, WebNote[]>;

/** 보행약자 세 유형 */
const ALL: Group[] = ["wheelchair", "elder", "child"];
/** 누구에게나 필요한 항목 (외국인 포함) */
const EVERY: Group[] = ["wheelchair", "elder", "child", "foreign"];
const FG: Group[] = ["foreign"];

export const km = (d: number) => kmOf("ko", d);

export function lotteryOf(f: Forest): Lottery | null {
  return f.national?.lottery ?? f.policyOnly ?? null;
}

export const sourceName = (s: SourceInfo, lang: Lang) => (lang === "en" ? (s.name_en ?? s.name) : s.name);

/** 이용자 유형별로 먼저 물어볼 핵심 항목 (전화 한 통에 다 묻기 어려우므로 우선순위) */
export const CORE_KEYS: Record<Group, string[]> = {
  wheelchair: ["roomEntrance", "accessibleToilet", "pathStepSlope", "disabledParking", "bathroomGrab"],
  elder: ["indoorStairs", "bedType", "parkingToRoom", "toiletDistance", "restArea"],
  child: ["diaperNursing", "parkingToRoom", "childHazard", "trailDetail", "kidsForest"],
  foreign: ["fgSignup", "fgPayment", "transit", "fgCheckinId", "fgLanguage"],
};

/** 산불조심기간: 산림보호법 시행규칙 기준 (객실 설명 원문에도 같은 날짜가 적혀 있음) */
const FIRE_SEASON = { ko: "봄 2.1~5.15, 가을 11.1~12.15", en: "spring Feb 1 – May 15, autumn Nov 1 – Dec 15" };

export function buildJourney(f: Forest, lang: Lang = "ko"): JourneyItem[] {
  const t = pick(lang);
  const en = lang === "en";
  const km = (d: number) => kmOf(lang, d);
  const q = (ko: string, eng: string) => (en ? { question: eng, questionKo: ko } : { question: ko });
  const pub = (key: string, date?: string) => {
    const s = SOURCES[key];
    return { source: "public" as const, sourceLabel: sourceName(s, lang), sourceDate: date ?? s.refDate, sourceUrl: s.url };
  };
  const n = f.national;
  const lot = lotteryOf(f);
  const nanum0 = f.nanum[0];
  const pts = f.survey?.points ?? [];
  const surveyHas = (re: RegExp) => pts.filter((p) => re.test(p.detail) || re.test(p.info));
  const stdDate = f.refDate;
  const safety = (k: string) => f.safety?.items.find((s) => s.key === k);
  const yes = (r?: string) => (r === "예" ? t("예", "Yes") : (r ?? ""));
  const kids = f.kidsPlaces;
  const rules = n?.rules;
  const isNational = !!n || f.ownership === "국유림";

  const items: JourneyItem[] = [];
  const add = (it: Omit<JourneyItem, "status"> & { status?: Status }) =>
    items.push({ status: "unknown", ...it } as JourneyItem);

  // 1 예약 (외국인 여행자)
  const checkNote = t("공공데이터에 없어요. 운영기관 확인 필요.", "Not in public data. Check with the operator.");
  add({
    key: "fgSignup",
    step: 1,
    label: t("회원가입·본인인증", "Sign-up and identity check"),
    groups: FG,
    value: isNational
      ? t(
          "국립자연휴양림은 숲나들e에서 예약해요. 외국인이 한국 휴대전화 없이 가입·본인인증할 수 있는지는 공공데이터에 없어요. 운영기관 확인 필요.",
          "National forests are booked on Foresttrip (숲나들e). Whether foreign visitors can sign up and verify identity without a Korean mobile phone is not in public data. Check with the operator.",
        )
      : checkNote,
    ...q(
      "외국인 관광객인데, 한국 휴대전화 없이 회원가입하고 객실을 예약할 수 있나요?",
      "I'm a foreign tourist. Can I sign up and book a room without a Korean mobile phone?",
    ),
  });
  add({
    key: "fgPayment",
    step: 1,
    label: t("결제 수단", "Payment"),
    groups: FG,
    value: checkNote,
    ...q("해외에서 발급한 카드로 결제할 수 있나요? 현장에서 결제할 수도 있나요?", "Can I pay with a card issued abroad? Can I pay on site?"),
  });
  add({
    key: "fgCheckinId",
    step: 1,
    label: t("입실 때 본인확인", "ID at check-in"),
    groups: FG,
    ...q(
      "입실할 때 여권으로 본인확인을 할 수 있나요? 예약한 사람이 아닌 일행이 먼저 도착하면 어떻게 하나요?",
      "Can I show my passport as ID at check-in? What if someone in my group arrives before the person who booked?",
    ),
    ...(rules?.idCheck
      ? {
          status: "warn",
          value: t(
            "객실 설명에 '입실 시 본인확인, 신분증 지참' 안내가 있어요. 여권도 되는지는 데이터에 없어요.",
            "Room descriptions say ID is checked at check-in. Whether a passport is accepted is not in the data.",
          ),
          ...pub("natfac"),
        }
      : { value: checkNote }),
  });
  add({
    key: "fgLanguage",
    step: 1,
    label: t("외국어 안내", "Language support"),
    groups: FG,
    value: checkNote,
    ...q("영어로 안내받을 수 있는 직원이나 안내문이 있나요?", "Is there staff or written information in English?"),
  });
  if (f.asean) {
    const a = f.asean;
    const w = a.windows;
    add({
      key: "fgAsean",
      step: 1,
      label: t("아세안 우선예약", "ASEAN priority booking"),
      groups: FG,
      status: "ok",
      value: t(
        `아세안 ${a.countries.length}개국 이름의 객실 ${a.rooms.length}실을 매월 우선예약으로 받아요. 이용하려는 달의 전달 4~14일에 신청 (데이터 기간 ${w[0]?.month} ~ ${w[w.length - 1]?.month}). 자세한 내용은 아래 '외국인 이용 안내'.`,
        `${a.rooms.length} rooms named after ${a.countries.length} ASEAN countries are offered for priority booking every month. Apply on the 4th–14th of the month before your stay (data covers ${w[0]?.month} to ${w[w.length - 1]?.month}). See 'Guide for foreign visitors' below.`,
      ),
      question: "",
      ...pub("natpolicy", a.refDate),
    });
  }

  // 2 도착
  add({
    key: "parking",
    step: 2,
    label: t("주차", "Parking"),
    groups: ALL,
    ...q("주차장은 몇 대 정도 주차할 수 있나요? 성수기에도 자리가 있나요?", "How many cars can the parking lot hold? Is there space in peak season?"),
    ...(n?.parkingFreeMax
      ? {
          status: "ok",
          value: t(
            `객실당 무료 주차 최대 ${n.parkingFreeMax}대 (전체 주차장 규모는 데이터에 없음)`,
            `Up to ${n.parkingFreeMax} free parking space(s) per room (total parking capacity is not in the data)`,
          ),
          ...pub("natfac"),
        }
      : {}),
  });
  add({
    key: "disabledParking",
    step: 2,
    label: t("장애인 주차구역", "Accessible parking"),
    groups: ["wheelchair"],
    ...q(
      "장애인 전용 주차구역이 있나요? 숙소나 관리동과 얼마나 떨어져 있나요?",
      "Is there accessible parking? How far is it from the lodging or office?",
    ),
  });
  add({
    key: "parkingToRoom",
    step: 2,
    label: t("주차장에서 숙소까지 거리", "Parking to lodging distance"),
    groups: ["elder", "child"],
    ...q(
      "주차장에서 숙소까지 걸어서 몇 분인가요? 숙소 앞까지 차가 들어갈 수 있나요?",
      "How many minutes' walk is it from the parking lot to the lodging? Can a car drive up to the lodging?",
    ),
    ...(f.layoutMap
      ? {
          value: t(
            "전체 배치도 이미지로 주차장·객실 위치를 미리 볼 수 있음 (거리·경사는 배치도에 없음)",
            "The site map image shows where parking and rooms are (distance and slope are not on the map)",
          ),
          ...pub("natlayout"),
          sourceUrl: f.layoutMap,
        }
      : {}),
  });
  const bs = f.busStops ?? [];
  const b0 = bs[0];
  add({
    key: "transit",
    step: 2,
    label: t("대중교통(버스정류장)", "Public transport (bus stop)"),
    groups: FG,
    ...q(
      "가장 가까운 버스정류장에서 휴양림 입구까지 걸어갈 수 있나요? 버스는 하루에 몇 번 다니나요? 택시를 불러야 하나요?",
      "Can I walk from the nearest bus stop to the forest entrance? How many buses run a day? Do I need a taxi?",
    ),
    ...(b0
      ? {
          status: b0.distKm <= 1 ? "ok" : "warn",
          statusText:
            b0.distKm <= 1 ? t("위치만 확인", "Location only") : t("위치만 확인 · 1km 넘음", "Location only · over 1 km"),
          value:
            t(
              `가장 가까운 정류장 '${b0.name}' 직선 ${km(b0.distKm)}`,
              `Nearest stop '${b0.name}' (${romanize(b0.name)}), ${km(b0.distKm)} in a straight line`,
            ) +
            (bs.length > 1 ? t(` · 그다음 '${bs[1].name}' ${km(bs[1].distKm)}`, `; next '${bs[1].name}' (${romanize(bs[1].name)}), ${km(bs[1].distKm)}`) : "") +
            (b0.distKm > 1
              ? t(". 걷기에 멀 수 있어 택시가 필요할 수 있어요", ". It may be too far to walk; you may need a taxi")
              : "") +
            t(
              ". 정류장 위치만 확인한 것이고, 버스가 다니는지와 걸어갈 수 있는 길인지는 데이터에 없음",
              ". Only the stop location is confirmed; whether buses run and whether the walk is possible are not in the data",
            ),
          ...pub("busstop"),
        }
      : {
          value: t(
            "이 데이터에서 3km 안 정류장을 찾지 못했어요 (일부 시·군은 데이터에 없음). 택시나 차량이 필요할 수 있어요.",
            "No stop within 3 km was found in this data (some cities and counties are not included). You may need a taxi or car.",
          ),
          ...pub("busstop"),
        }),
  });

  const rs = f.rail;
  add({
    key: "railStation",
    step: 2,
    label: t("가까운 철도역", "Nearest train station"),
    groups: FG,
    ...q(
      "가장 가까운 기차역에서 휴양림까지 버스나 택시로 갈 수 있나요? 픽업이 있나요?",
      "Can I get from the nearest train station to the forest by bus or taxi? Is there a pick-up?",
    ),
    ...(rs
      ? {
          status: "ok" as const,
          statusText: t("위치만 확인", "Location only"),
          value: t(
            `한국철도공사 '${rs.name}역' 직선 ${km(rs.distKm)}. 역 위치만 확인한 것이고, 이 역에 서는 열차와 역에서 휴양림까지 가는 방법은 데이터에 없음`,
            `KORAIL '${rs.name}' station (${romanize(rs.name)}), ${km(rs.distKm)} in a straight line. Only the station location is confirmed; which trains stop there and how to get from the station to the forest are not in the data`,
          ),
          ...pub("rail"),
        }
      : {}),
  });
  const ic = f.infoCenters ?? [];
  add({
    key: "fgInfoCenter",
    step: 2,
    label: t("관광안내소(외국어)", "Tourist information center"),
    groups: FG,
    ...q(
      "근처 관광안내소에서 휴양림 가는 길이나 예약을 외국어로 안내받을 수 있나요?",
      "Can a nearby tourist information center help in English with directions or booking?",
    ),
    ...(ic[0]
      ? {
          status: (ic[0].lang && !/^(한|한국어)$/.test(ic[0].lang) ? "ok" : "warn") as Status,
          value:
            t(`같은 읍·면에 '${ic[0].name}'`, `'${ic[0].name}' in the same town`) +
            (ic[0].lang ? t(` (제공 언어: ${ic[0].lang})`, ` (languages: ${ic[0].lang})`) : t(" (제공 언어 정보 없음)", " (languages not listed)")) +
            (ic[0].hours ? t(`, ${ic[0].hours}`, `, ${ic[0].hours}`) : "") +
            (ic[0].tel ? `, ${ic[0].tel}` : ""),
          ...pub("touristinfo"),
        }
      : {}),
  });

  // 3 진입로
  const slopePts = surveyHas(/턱|경사|계단/);
  add({
    key: "pathStepSlope",
    step: 3,
    label: t("진입로 단차·경사·노면", "Path steps, slope and surface"),
    groups: ["wheelchair", "child"],
    ...q(
      "주차장에서 숙소·화장실까지 가는 길에 턱이나 계단이 있나요? 경사가 급한 구간이 있나요?",
      "Are there steps or stairs on the way from parking to the lodging and toilets? Are there steep sections?",
    ),
    ...(slopePts.length
      ? {
          status: "warn",
          value: t(
            `현장조사에서 턱·경사·계단 ${slopePts.length}곳 기록 (예: ${slopePts[0].place} – ${slopePts[0].detail || slopePts[0].info})`,
            `Field survey recorded ${slopePts.length} step(s), slope(s) or stair(s) (e.g. ${slopePts[0].place} – ${slopePts[0].detail || slopePts[0].info}, Korean original)`,
          ),
          ...pub("jeju", f.survey?.refDate),
        }
      : {}),
  });
  add({
    key: "stairsHandrail",
    step: 3,
    label: t("계단 손잡이", "Stair handrails"),
    groups: ["elder"],
    ...q("숙소나 화장실로 가는 길의 계단에 손잡이가 있나요?", "Do the stairs to the lodging or toilets have handrails?"),
    ...(safety("stairsNonSlip")
      ? {
          value: t(
            `운영기관 월별 안전점검에서 '계단 미끄럼방지 처리' ${safety("stairsNonSlip")!.result}. 손잡이는 점검 항목에 없음`,
            `Operator's monthly safety check: 'non-slip stairs' – ${yes(safety("stairsNonSlip")!.result)}. Handrails are not a check item`,
          ),
          ...pub("natsafety", safety("stairsNonSlip")!.date),
        }
      : {}),
  });

  // 4 숙소
  if (f.stay === false) {
    add({
      key: "stay",
      step: 4,
      label: t("숙박", "Overnight stay"),
      groups: EVERY,
      status: "no",
      value: t("숙박시설 없음 (당일 방문)", "No lodging (day visit only)"),
      question: "",
      ...pub("std", stdDate),
    });
  } else {
    add({
      key: "stay",
      step: 4,
      label: t("숙박", "Overnight stay"),
      groups: EVERY,
      ...q("숙박할 수 있는 객실이 있나요?", "Are there rooms for an overnight stay?"),
      ...(n?.rooms
        ? { status: "ok", value: t(`숙박 객실 ${n.rooms}실, 야영 ${n.camps}면`, `${n.rooms} rooms, ${n.camps} campsites`), ...pub("natfac") }
        : f.stay
          ? { status: "ok", value: t("숙박 가능", "Overnight stay available"), ...pub("std", stdDate) }
          : {}),
    });
  }
  if (f.stay !== false) {
    add({
      key: "checkinTime",
      step: 4,
      label: t("입실·퇴실 시간", "Check-in and check-out"),
      groups: FG,
      ...q("입실·퇴실 시간이 어떻게 되나요? 늦게 도착해도 입실할 수 있나요?", "What are the check-in and check-out times? Can I check in if I arrive late?"),
      ...(rules?.checkin
        ? {
            status: "ok",
            value: t(
              `입실 ${rules.checkin}${rules.checkinEnd ? `~${rules.checkinEnd}` : ""}, 퇴실 다음 날 ${rules.checkout ?? "–"} (객실 설명 기준)`,
              `Check-in ${rules.checkin}${rules.checkinEnd ? `–${rules.checkinEnd}` : ""}, check-out ${rules.checkout ?? "–"} the next day (from room descriptions)`,
            ),
            ...pub("natfac"),
          }
        : {}),
    });
    const dl = lot?.disabled.count ?? 0;
    const dp = n?.disabledPriorityRooms ?? 0;
    add({
      key: "disabledRoom",
      step: 4,
      label: t("장애인 추첨·우선예약 객실", "Disabled lottery / priority rooms"),
      groups: ["wheelchair"],
      ...q(
        "장애인 객실(또는 장애인 추첨·우선예약 객실)이 있나요? 그 객실은 문턱 없이 휠체어로 들어갈 수 있나요?",
        "Are there rooms for disabled guests (or disabled lottery/priority rooms)? Can a wheelchair enter them without a threshold?",
      ),
      ...(dl > 0
        ? {
            status: "ok",
            value: t(
              `장애인 추첨제 대상 객실 ${dl}실 (${lot!.disabled.rooms.slice(0, 3).join(", ")}${dl > 3 ? " 등" : ""}). 추첨 대상일 뿐, 객실 구조(문턱·욕실)는 데이터에 없음`,
              `${dl} room(s) in the disabled lottery (${lot!.disabled.rooms.slice(0, 3).join(", ")}${dl > 3 ? " etc." : ""}). Being in the lottery says nothing about the room layout (threshold, bathroom)`,
            ),
            ...pub("natpolicy"),
          }
        : dp > 0
          ? {
              status: "ok",
              value: t(
                `객실 설명에 '장애인 우선예약' 표기 ${dp}실. 객실 구조(문턱·욕실)는 데이터에 없음`,
                `${dp} room(s) marked 'disabled priority booking' in descriptions. Room layout (threshold, bathroom) is not in the data`,
              ),
              ...pub("natfac"),
            }
          : n
            ? { value: t("국립휴양림 객실·예약 데이터에 장애인 대상 객실 표기 없음", "No room marked for disabled guests in the national forest room and booking data"), ...pub("natfac") }
            : {}),
    });
    const dd = (f.discounts ?? []).filter((d) => d.group === "장애인");
    add({
      key: "disabledDiscount",
      step: 4,
      label: t("장애인 이용료 할인", "Disability discount"),
      groups: ["wheelchair"],
      ...q("장애인 할인이 있나요? 할인율과 필요한 증빙은 무엇인가요?", "Is there a disability discount? What is the rate and what proof is needed?"),
      ...(dd.length
        ? {
            status: "ok",
            value:
              dd
                .map((d) =>
                  t(
                    `${d.target} 비수기 평일 ${d.offWeekday}%·주말 ${d.offWeekend}%, 성수기 ${d.peakWeekday}%`,
                    `${d.target.includes("중증") ? "Severe" : "Mild"}: off-season weekday ${d.offWeekday}%, weekend ${d.offWeekend}%, peak ${d.peakWeekday}%`,
                  ),
                )
                .join(" / ") + t(" (객실 시설 사용료 기준)", " (on the room fee)"),
            ...pub("natdiscount"),
          }
        : {}),
    });
    add({
      key: "roomEntrance",
      step: 4,
      label: t("객실 출입문 문턱·문 폭", "Room door threshold and width"),
      groups: ["wheelchair"],
      ...q(
        "객실 출입문에 문턱이 있나요? 높이는 몇 cm인가요? 문 폭은 휠체어(약 80cm)가 지나갈 수 있나요?",
        "Is there a threshold at the room door? How high (cm)? Is the door wide enough for a wheelchair (about 80 cm)?",
      ),
    });
    add({
      key: "bedType",
      step: 4,
      label: t("침대방/온돌방", "Bed or floor (ondol) room"),
      groups: ["elder"],
      ...q("침대가 있는 객실이 있나요? 몇 실인가요?", "Are there rooms with beds? How many?"),
      ...(n && n.bedRooms > 0
        ? {
            status: "ok",
            value: t(
              `객실 설명에 침대 언급 ${n.bedRooms}실 (${n.bedRoomNames.slice(0, 3).join(", ")})`,
              `Beds mentioned in ${n.bedRooms} room description(s) (${n.bedRoomNames.slice(0, 3).join(", ")})`,
            ),
            ...pub("natfac"),
          }
        : n
          ? {
              value: t(
                `객실 설명에 침대 언급 없음 (온돌 언급 ${n.ondolRooms}실)`,
                `No bed mentioned in room descriptions (floor-heated ondol mentioned in ${n.ondolRooms})`,
              ),
              ...pub("natfac"),
            }
          : {}),
    });
    add({
      key: "indoorStairs",
      step: 4,
      label: t("객실 안 계단(다락·복층)", "Stairs inside the room (loft)"),
      groups: ["elder", "child"],
      ...q(
        "객실 안에 다락이나 복층 계단이 있나요? 계단 없는 단층 객실이 있나요?",
        "Does the room have loft or split-level stairs? Are there single-level rooms without stairs?",
      ),
      ...(n && n.loftRooms > 0
        ? {
            status: "warn",
            value: t(
              `다락·복층·2층 언급 객실 ${n.loftRooms}실 (${n.loftRoomNames.slice(0, 3).join(", ")}) – 예약 시 단층인지 확인`,
              `Loft, split-level or 2nd floor mentioned in ${n.loftRooms} room(s) (${n.loftRoomNames.slice(0, 3).join(", ")}) – check it is single-level when booking`,
            ),
            ...pub("natfac"),
          }
        : {}),
    });
    add({
      key: "bathroomGrab",
      step: 4,
      label: t("욕실 안전손잡이·턱", "Bathroom grab bars and step"),
      groups: ["wheelchair", "elder"],
      ...q("객실 욕실에 안전손잡이가 있나요? 욕실 입구에 턱이 있나요?", "Does the bathroom have grab bars? Is there a step at the bathroom door?"),
    });
    add({
      key: "childHazard",
      step: 4,
      label: t("난간·추락 위험", "Railings and fall risks"),
      groups: ["child"],
      ...q(
        "객실이나 테라스에 아이가 떨어질 위험이 있는 곳(낮은 난간, 다락 계단)이 있나요?",
        "Are there places in the room or on the terrace where a child could fall (low railings, loft stairs)?",
      ),
      ...(safety("playground")?.result === "예"
        ? {
            value: t(
              "어린이 놀이시설 월 1회 안전검사 '예' (운영기관 자체 점검). 객실 난간 정보는 없음",
              "Monthly playground safety inspection: Yes (operator's own check). No information on room railings",
            ),
            ...pub("natsafety", safety("playground")!.date),
          }
        : {}),
    });
  }

  // 5 화장실
  const dt = f.toilets.find((x) => x.disabled > 0);
  const ct = f.toilets.find((x) => x.child > 0);
  add({
    key: "accessibleToilet",
    step: 5,
    label: t("장애인 화장실", "Accessible toilet"),
    groups: ["wheelchair"],
    ...q(
      "장애인 화장실이 있나요? 객실 안인가요, 관리동이나 공용 화장실인가요?",
      "Is there an accessible toilet? Is it in the room, or in the office or a shared toilet?",
    ),
    ...(f.survey?.accessibleToilet
      ? {
          status: "ok",
          value:
            t("현장조사: ", "Field survey: ") +
            surveyHas(/장애인화장실/)
              .map((p) => p.place)
              .slice(0, 3)
              .join(", "),
          ...pub("jeju", f.survey.refDate),
        }
      : dt && dt.distKm <= 0.5
        ? {
            status: "ok",
            value: t(
              `공중화장실 '${dt.name}' 장애인용 대변기 ${dt.disabled}개 (직선 ${km(dt.distKm)})`,
              `Public toilet '${dt.name}': ${dt.disabled} accessible toilet(s) (${km(dt.distKm)} straight line)`,
            ),
            ...pub("toilet", dt.refDate),
          }
        : f.facilityHints.accessibleToilet
          ? { status: "ok", value: t("주요시설명에 '장애인화장실' 표기", "'Accessible toilet' listed in main facilities"), ...pub("std", stdDate) }
          : dt
            ? {
                status: "warn",
                value: t(
                  `직선 ${km(dt.distKm)} 떨어진 공중화장실 '${dt.name}'에 장애인용 대변기 ${dt.disabled}개 – 휴양림 안인지 확인 필요`,
                  `Public toilet '${dt.name}' ${km(dt.distKm)} away has ${dt.disabled} accessible toilet(s) – check whether it is inside the forest`,
                ),
                ...pub("toilet", dt.refDate),
              }
            : {}),
  });
  add({
    key: "toiletDistance",
    step: 5,
    label: t("숙소에서 화장실까지 거리", "Lodging to toilet distance"),
    groups: ["elder"],
    ...q(
      "객실 안에 화장실이 있나요? 공용 화장실이라면 숙소에서 얼마나 떨어져 있나요?",
      "Is there a toilet in the room? If shared, how far is it from the lodging?",
    ),
  });
  add({
    key: "diaperNursing",
    step: 5,
    label: t("기저귀 교환대·수유실", "Diaper station and nursing room"),
    groups: ["child"],
    ...q("기저귀 교환대나 수유실이 있나요? 어느 건물에 있나요?", "Is there a diaper changing station or nursing room? In which building?"),
    ...(ct
      ? {
          value: t(
            `근처 공중화장실 '${ct.name}'에 어린이용 변기 ${ct.child}개 (직선 ${km(ct.distKm)}). 기저귀 교환대 정보는 공공데이터에 없음`,
            `Nearby public toilet '${ct.name}' has ${ct.child} children's toilet(s) (${km(ct.distKm)}). Diaper station information is not in public data`,
          ),
          ...pub("toilet", ct.refDate),
        }
      : {}),
  });

  // 6 숲길
  add({
    key: "barrierFreeTrail",
    step: 6,
    label: t("무장애나눔길", "Barrier-free trail"),
    groups: ALL,
    ...q(
      "휠체어나 유모차로 다닐 수 있는 무장애 데크길이나 평탄한 산책로가 있나요?",
      "Is there a barrier-free deck path or flat walking trail for wheelchairs or strollers?",
    ),
    ...(nanum0 && nanum0.distKm <= 0.5
      ? {
          status: "ok",
          value: t(
            `'${nanum0.name}' ${nanum0.lengthM ? `${nanum0.lengthM.toLocaleString()}m` : ""} (${nanum0.year}년 조성, 휴양림 좌표에서 직선 ${km(nanum0.distKm)})`,
            `'${nanum0.name}' ${nanum0.lengthM ? `${nanum0.lengthM.toLocaleString()} m` : ""} (built ${nanum0.year}, ${km(nanum0.distKm)} from the forest point)`,
          ),
          ...pub("nanum"),
        }
      : nanum0
        ? {
            status: "warn",
            value: t(
              `직선 ${km(nanum0.distKm)} 떨어진 곳에 '${nanum0.name}' – 휴양림 안인지 확인 필요`,
              `'${nanum0.name}' is ${km(nanum0.distKm)} away – check whether it is inside the forest`,
            ),
            ...pub("nanum"),
          }
        : f.facilityHints.barrierFreeTrail
          ? { status: "ok", value: t("주요시설명에 무장애 산책로 표기", "Barrier-free trail listed in main facilities"), ...pub("std", stdDate) }
          : {
              value: t(
                "무장애나눔길 조성정보에는 반경 3km 안에 등록된 길이 없음",
                "No barrier-free trail registered within 3 km in the trail data",
              ),
              ...pub("nanum"),
            }),
  });
  const widthPts = surveyHas(/폭|경사구간|데크/);
  add({
    key: "trailDetail",
    step: 6,
    label: t("숲길 경사·폭·노면", "Trail slope, width and surface"),
    groups: ["wheelchair", "child"],
    ...q(
      "산책로 경사는 어느 정도인가요? 폭은 휠체어·유모차가 지나갈 만큼 넓은가요? 노면은 데크인가요, 흙길인가요?",
      "How steep are the trails? Are they wide enough for wheelchairs and strollers? Is the surface deck or dirt?",
    ),
    ...(widthPts.length
      ? {
          status: "ok",
          value:
            widthPts
              .slice(0, 3)
              .map((p) => `${p.place}: ${p.detail}`)
              .join(" / ") + t("", " (Korean original)"),
          ...pub("jeju", f.survey?.refDate),
        }
      : {}),
  });
  const restPts = surveyHas(/쉼터|벤치|의자/);
  add({
    key: "restArea",
    step: 6,
    label: t("쉼터·벤치", "Rest areas and benches"),
    groups: ["elder"],
    ...q("산책로 중간에 쉴 수 있는 벤치나 쉼터가 얼마나 자주 있나요?", "How often are there benches or shelters along the trails?"),
    ...(restPts.length
      ? {
          status: "ok",
          value: t(`현장조사 쉼터·벤치 기록 ${restPts.length}곳`, `Field survey recorded ${restPts.length} rest area(s) or bench(es)`),
          ...pub("jeju", f.survey?.refDate),
        }
      : {}),
  });
  add({
    key: "kidsForest",
    step: 6,
    label: t("유아숲체험원·짧은 순환코스", "Children's forest / short loop"),
    groups: ["child"],
    ...q(
      "아이와 걷기 좋은 짧은 순환 코스나 유아숲체험원이 있나요?",
      "Is there a short loop trail or a children's forest experience center for walking with kids?",
    ),
    ...(kids?.inside.length
      ? {
          status: "ok",
          value: t(
            `${kids.inside.map((p) => p.name).join(", ")} (이름으로 연결, 운영기간·참여방법은 기관 확인)`,
            `${kids.inside.map((p) => p.name).join(", ")} (linked by name; check opening periods and how to join)`,
          ),
          ...pub("kidsforest"),
        }
      : f.facilityHints.kidsForest
        ? {
            status: "ok",
            value: t("주요시설명에 유아숲체험원·숲놀이터 표기", "Children's forest or forest playground listed in main facilities"),
            ...pub("std", stdDate),
          }
        : kids?.sameAreaCount
          ? {
              status: "warn",
              value: t(
                `같은 ${f.sigungu}에 유아숲체험원 ${kids.sameAreaCount}곳 (${kids.sameArea
                  .slice(0, 2)
                  .map((p) => p.name)
                  .join(", ")}${kids.sameAreaCount > 2 ? " 등" : ""}) – 휴양림 안은 아님`,
                `${kids.sameAreaCount} children's forest center(s) in the same city/county (${kids.sameArea
                  .slice(0, 2)
                  .map((p) => p.name)
                  .join(", ")}${kids.sameAreaCount > 2 ? " etc." : ""}) – not inside the forest`,
              ),
              ...pub("kidsforest"),
            }
          : {}),
  });

  // 7 안전
  add({
    key: "contact",
    step: 7,
    label: t("운영 연락처", "Operator phone"),
    groups: EVERY,
    question: "",
    ...(f.tel
      ? { status: "ok", value: f.tel, ...(f.telSource && SOURCES[f.telSource] ? pub(f.telSource) : pub("std", stdDate)) }
      : { value: t("공공데이터에 전화번호 없음 – 홈페이지 확인", "No phone number in public data – check the website") }),
  });
  add({
    key: "emergency",
    step: 7,
    label: t("긴급·관광 안내 번호", "Emergency and travel hotlines"),
    groups: FG,
    status: "ok",
    value: t(
      "화재·구조·구급 119, 경찰 112, 관광통역안내 1330 (24시간, 외국어 안내). 전국 공통 번호",
      "Fire, rescue and ambulance 119 · Police 112 · Korea Travel Hotline 1330 (24 hours, interpretation). Same numbers nationwide",
    ),
    question: "",
  });
  add({
    key: "fireCooking",
    step: 7,
    label: t("취사·바비큐·산불 예방", "Cooking, barbecue and wildfire rules"),
    groups: FG,
    ...q(
      "객실 밖에서 바비큐나 숯불을 쓸 수 있나요? 쓰레기는 어디에 어떻게 버리나요?",
      "Can I use a barbecue or charcoal outside the room? Where and how do I dispose of trash?",
    ),
    ...(rules?.bbq === "fireSeason"
      ? {
          status: "warn",
          value: t(
            `객실 설명: 산불조심기간(${FIRE_SEASON.ko}, 해마다 연장될 수 있음)에는 바비큐·숯불 사용 금지. 쓰레기 처리 방법은 데이터에 없음`,
            `Room descriptions: no barbecue or charcoal during the wildfire prevention season (${FIRE_SEASON.en}; may be extended). Trash rules are not in the data`,
          ),
          ...pub("natfac"),
        }
      : rules?.bbq === "yearRound"
        ? {
            status: "warn",
            value: t(
              "객실 설명: 연중 숯불·바비큐 사용 금지. 쓰레기 처리 방법은 데이터에 없음",
              "Room descriptions: charcoal and barbecue are banned all year. Trash rules are not in the data",
            ),
            ...pub("natfac"),
          }
        : {}),
  });
  const aed = safety("aed");
  add({
    key: "aed",
    step: 7,
    label: t("자동심장충격기(AED)", "AED (defibrillator)"),
    groups: EVERY,
    ...q("자동심장충격기(AED)는 어느 건물에 있나요?", "In which building is the AED (defibrillator)?"),
    ...(aed?.result === "예"
      ? {
          status: "ok",
          value: t(
            "월별 안전점검에서 AED 관리자 지정·점검 '예' – 설치 위치는 데이터에 없음",
            "Monthly safety check: AED manager assigned and checked – Yes. Its location is not in the data",
          ),
          ...pub("natsafety", aed.date),
        }
      : {}),
  });
  add({
    key: "hospital",
    step: 7,
    label: t("가까운 응급실·병원", "Nearest ER and hospital"),
    groups: EVERY,
    ...q(
      "가장 가까운 응급실이나 병원(소아과)은 어디인가요? 차로 몇 분 걸리나요?",
      "Where is the nearest emergency room or hospital (pediatrics)? How many minutes by car?",
    ),
  });

  // 운영자 확인 덮어쓰기
  const op = OPERATOR[f.name];
  if (op) {
    for (const it of items) {
      const o = op.items[it.key];
      if (o) {
        it.status = o.status;
        it.statusText = undefined;
        it.value = en ? (o.value_en ?? `${o.value} (Korean original)`) : o.value;
        it.source = "operator";
        it.sourceLabel = t("숲누림 운영자 전화 확인", "Checked by phone (Soopnurim)");
        it.sourceDate = op.checkedAt;
        it.sourceUrl = undefined;
      }
    }
  }
  // 온라인 자료 참고: 상태는 그대로 두고 별도 표시
  for (const w of WEB[f.name] ?? []) {
    const it = items.find((i) => i.key === w.item);
    if (it) it.web = [...(it.web ?? []), w];
  }
  return items;
}

export function summarize(f: Forest): ForestSummary {
  const items = buildJourney(f);
  const n0 = f.nanum[0];
  const lot = lotteryOf(f);
  const dt = f.toilets.find((x) => x.disabled > 0);
  return {
    id: f.id,
    name: f.name,
    sido: f.sido,
    sigungu: f.sigungu,
    address: f.address,
    ownership: f.ownership,
    lat: f.lat,
    lng: f.lng,
    stay: f.stay,
    tel: f.tel,
    homepage: f.homepage ?? "",
    closed: f.closed,
    notOpen: !!f.notOpen,
    national: !!f.national,
    survey: !!f.survey,
    roomCount: f.national?.rooms ?? 0,
    disabledLotteryRooms: Math.max(lot?.disabled.count ?? 0, f.national?.disabledPriorityRooms ?? 0),
    multiChildLotteryRooms: lot?.multiChild.count ?? 0,
    nearestDisabledToilet: dt ? { name: dt.name, distKm: dt.distKm, count: dt.disabled } : null,
    nanumNearest: n0 ? { name: n0.name, distKm: n0.distKm, lengthM: n0.lengthM } : null,
    kidsForest: f.facilityHints.kidsForest || !!f.kidsPlaces?.inside.length,
    discount: (f.discounts ?? []).some((d) => d.group === "장애인"),
    lotteryRate: f.booking?.lottery?.avgRate ?? null,
    refDate: f.refDate,
    sourceCount: new Set(f.sources).size,
    busNearestKm: f.busStops?.[0]?.distKm ?? null,
    asean: !!f.asean,
    items: items.map((it) => ({ g: groupsMask(it.groups), k: it.status === "unknown" ? 0 : 1 })),
  };
}

/**
 * 처음 온 사람에게 보여 줄 예시 휴양림: 객실·연락처·예약 정보가 있는 국립휴양림 중
 * 출처 있는 정보가 가장 많은 곳 (빈칸·질문·객실까지 모두 보이도록 빈칸도 남아 있어야 함)
 */
export function pickExample(list: ForestSummary[]) {
  let best: ForestSummary | null = null;
  let bestK = -1;
  for (const f of list) {
    if (f.closed || !f.national || !f.roomCount || !f.tel) continue;
    const k = f.items.filter((i) => i.k).length;
    if (k > bestK && k < f.items.length) [best, bestK] = [f, k];
  }
  return best?.id ?? null;
}

export function getForest(id: string) {
  return FORESTS.find((f) => f.id === id);
}
