/**
 * 산림공공데이터 → 여정 단계(①~⑥)별 확인 항목 변환.
 * 원칙: "이용 가능" 판정을 하지 않고, 항목별로 무엇이 확인됐고 무엇이 빈칸인지만 표시한다.
 *       데이터에 없다는 사실은 '없음'이 아니라 빈칸으로 둔다.
 */
import raw from "@/data/forests.json";
import operatorRaw from "@/data/operator_checks.json";
import webRaw from "@/data/web_checks.json";
import type { Forest, ForestSummary, Group, JourneyItem, Lottery, SourceInfo, Status, WebNote } from "./types";
import { groupsMask } from "./groups";

export const SOURCES = raw.sources as Record<string, SourceInfo>;
export const FORESTS = raw.forests as unknown as Forest[];

type OperatorEntry = { checkedAt: string; items: Record<string, { status: Status; value: string }> };
const OPERATOR = Object.fromEntries(
  Object.entries(operatorRaw as Record<string, unknown>).filter(([k]) => !k.startsWith("_")),
) as Record<string, OperatorEntry>;

const WEB = Object.fromEntries(
  Object.entries(webRaw as Record<string, unknown>).filter(([k]) => !k.startsWith("_")),
) as Record<string, WebNote[]>;


const ALL: Group[] = ["wheelchair", "elder", "child"];
type SrcKey = string;

function pub(key: SrcKey, date?: string) {
  const s = SOURCES[key];
  return { source: "public" as const, sourceLabel: s.name, sourceDate: date ?? s.refDate, sourceUrl: s.url };
}

export const km = (d: number) => (d < 0.05 ? "50m 미만" : d < 1 ? `${Math.round(d * 1000)}m` : `${d.toFixed(1)}km`);

export function lotteryOf(f: Forest): Lottery | null {
  return f.national?.lottery ?? f.policyOnly ?? null;
}

/** 이용자 유형별로 먼저 물어볼 핵심 항목 (전화 한 통에 다 묻기 어려우므로 우선순위) */
export const CORE_KEYS: Record<Group, string[]> = {
  wheelchair: ["roomEntrance", "accessibleToilet", "pathStepSlope", "disabledParking", "bathroomGrab"],
  elder: ["indoorStairs", "bedType", "parkingToRoom", "toiletDistance", "restArea"],
  child: ["diaperNursing", "parkingToRoom", "childHazard", "trailDetail", "kidsForest"],
};

export function buildJourney(f: Forest): JourneyItem[] {
  const n = f.national;
  const lot = lotteryOf(f);
  const nanum0 = f.nanum[0];
  const pts = f.survey?.points ?? [];
  const surveyHas = (re: RegExp) => pts.filter((p) => re.test(p.detail) || re.test(p.info));
  const stdDate = f.refDate;
  const safety = (k: string) => f.safety?.items.find((s) => s.key === k);
  const kids = f.kidsPlaces;

  const items: JourneyItem[] = [];
  const add = (it: Omit<JourneyItem, "status"> & { status?: Status }) =>
    items.push({ status: "unknown", ...it } as JourneyItem);

  // ① 도착
  add({
    key: "parking",
    step: 1,
    label: "주차",
    groups: ALL,
    question: "주차장은 몇 대 정도 주차할 수 있나요? 성수기에도 자리가 있나요?",
    ...(n?.parkingFreeMax
      ? { status: "ok", value: `객실당 무료 주차 최대 ${n.parkingFreeMax}대 (전체 주차장 규모는 데이터에 없음)`, ...pub("natfac") }
      : {}),
  });
  add({
    key: "disabledParking",
    step: 1,
    label: "장애인 주차구역",
    groups: ["wheelchair"],
    question: "장애인 전용 주차구역이 있나요? 숙소나 관리동과 얼마나 떨어져 있나요?",
  });
  add({
    key: "parkingToRoom",
    step: 1,
    label: "주차장에서 숙소까지 거리",
    groups: ["elder", "child"],
    question: "주차장에서 숙소까지 걸어서 몇 분인가요? 숙소 앞까지 차가 들어갈 수 있나요?",
    ...(f.layoutMap
      ? { value: "전체 배치도 이미지로 주차장·객실 위치를 미리 볼 수 있음 (거리·경사는 배치도에 없음)", ...pub("natlayout"), sourceUrl: f.layoutMap }
      : {}),
  });

  // ② 진입로
  const slopePts = surveyHas(/턱|경사|계단/);
  add({
    key: "pathStepSlope",
    step: 2,
    label: "진입로 단차·경사·노면",
    groups: ["wheelchair", "child"],
    question: "주차장에서 숙소·화장실까지 가는 길에 턱이나 계단이 있나요? 경사가 급한 구간이 있나요?",
    ...(slopePts.length
      ? {
          status: "warn",
          value: `현장조사에서 턱·경사·계단 ${slopePts.length}곳 기록 (예: ${slopePts[0].place} – ${slopePts[0].detail || slopePts[0].info})`,
          ...pub("jeju", f.survey?.refDate),
        }
      : {}),
  });
  add({
    key: "stairsHandrail",
    step: 2,
    label: "계단 손잡이",
    groups: ["elder"],
    question: "숙소나 화장실로 가는 길의 계단에 손잡이가 있나요?",
    ...(safety("stairsNonSlip")
      ? {
          value: `운영기관 월별 안전점검에서 '계단 미끄럼방지 처리' ${safety("stairsNonSlip")!.result}. 손잡이는 점검 항목에 없음`,
          ...pub("natsafety", safety("stairsNonSlip")!.date),
        }
      : {}),
  });

  // ③ 숙소
  if (f.stay === false) {
    add({
      key: "stay",
      step: 3,
      label: "숙박",
      groups: ALL,
      status: "no",
      value: "숙박시설 없음 (당일 방문)",
      question: "",
      ...pub("std", stdDate),
    });
  } else {
    add({
      key: "stay",
      step: 3,
      label: "숙박",
      groups: ALL,
      question: "숙박할 수 있는 객실이 있나요?",
      ...(n?.rooms
        ? { status: "ok", value: `숙박 객실 ${n.rooms}실, 야영 ${n.camps}면`, ...pub("natfac") }
        : f.stay
          ? { status: "ok", value: "숙박 가능", ...pub("std", stdDate) }
          : {}),
    });
  }
  if (f.stay !== false) {
    const dl = lot?.disabled.count ?? 0;
    const dp = n?.disabledPriorityRooms ?? 0;
    add({
      key: "disabledRoom",
      step: 3,
      label: "장애인 추첨·우선예약 객실",
      groups: ["wheelchair"],
      question: "장애인 객실(또는 장애인 추첨·우선예약 객실)이 있나요? 그 객실은 문턱 없이 휠체어로 들어갈 수 있나요?",
      ...(dl > 0
        ? {
            status: "ok",
            value: `장애인 추첨제 대상 객실 ${dl}실 (${lot!.disabled.rooms.slice(0, 3).join(", ")}${dl > 3 ? " 등" : ""}). 추첨 대상일 뿐, 객실 구조(문턱·욕실)는 데이터에 없음`,
            ...pub("natpolicy"),
          }
        : dp > 0
          ? {
              status: "ok",
              value: `객실 설명에 '장애인 우선예약' 표기 ${dp}실. 객실 구조(문턱·욕실)는 데이터에 없음`,
              ...pub("natfac"),
            }
          : n
            ? { value: "국립휴양림 객실·예약 데이터에 장애인 대상 객실 표기 없음", ...pub("natfac") }
            : {}),
    });
    const dd = (f.discounts ?? []).filter((d) => d.group === "장애인");
    add({
      key: "disabledDiscount",
      step: 3,
      label: "장애인 이용료 할인",
      groups: ["wheelchair"],
      question: "장애인 할인이 있나요? 할인율과 필요한 증빙은 무엇인가요?",
      ...(dd.length
        ? {
            status: "ok",
            value: dd.map((d) => `${d.target} 비수기 평일 ${d.offWeekday}%·주말 ${d.offWeekend}%, 성수기 ${d.peakWeekday}%`).join(" / ") + " (객실 시설 사용료 기준)",
            ...pub("natdiscount"),
          }
        : {}),
    });
    add({
      key: "roomEntrance",
      step: 3,
      label: "객실 출입문 문턱·문 폭",
      groups: ["wheelchair"],
      question: "객실 출입문에 문턱이 있나요? 높이는 몇 cm인가요? 문 폭은 휠체어(약 80cm)가 지나갈 수 있나요?",
    });
    add({
      key: "bedType",
      step: 3,
      label: "침대방/온돌방",
      groups: ["elder"],
      question: "침대가 있는 객실이 있나요? 몇 실인가요?",
      ...(n && n.bedRooms > 0
        ? { status: "ok", value: `객실 설명에 침대 언급 ${n.bedRooms}실 (${n.bedRoomNames.slice(0, 3).join(", ")})`, ...pub("natfac") }
        : n
          ? { value: `객실 설명에 침대 언급 없음 (온돌 언급 ${n.ondolRooms}실)`, ...pub("natfac") }
          : {}),
    });
    add({
      key: "indoorStairs",
      step: 3,
      label: "객실 안 계단(다락·복층)",
      groups: ["elder", "child"],
      question: "객실 안에 다락이나 복층 계단이 있나요? 계단 없는 단층 객실이 있나요?",
      ...(n && n.loftRooms > 0
        ? {
            status: "warn",
            value: `다락·복층·2층 언급 객실 ${n.loftRooms}실 (${n.loftRoomNames.slice(0, 3).join(", ")}) – 예약 시 단층인지 확인`,
            ...pub("natfac"),
          }
        : {}),
    });
    add({
      key: "bathroomGrab",
      step: 3,
      label: "욕실 안전손잡이·턱",
      groups: ["wheelchair", "elder"],
      question: "객실 욕실에 안전손잡이가 있나요? 욕실 입구에 턱이 있나요?",
    });
    add({
      key: "childHazard",
      step: 3,
      label: "난간·추락 위험",
      groups: ["child"],
      question: "객실이나 테라스에 아이가 떨어질 위험이 있는 곳(낮은 난간, 다락 계단)이 있나요?",
      ...(safety("playground")?.result === "예"
        ? { value: "어린이 놀이시설 월 1회 안전검사 '예' (운영기관 자체 점검). 객실 난간 정보는 없음", ...pub("natsafety", safety("playground")!.date) }
        : {}),
    });
  }

  // ④ 화장실
  const dt = f.toilets.find((t) => t.disabled > 0);
  const ct = f.toilets.find((t) => t.child > 0);
  add({
    key: "accessibleToilet",
    step: 4,
    label: "장애인 화장실",
    groups: ["wheelchair"],
    question: "장애인 화장실이 있나요? 객실 안인가요, 관리동이나 공용 화장실인가요?",
    ...(f.survey?.accessibleToilet
      ? {
          status: "ok",
          value: `현장조사: ${surveyHas(/장애인화장실/)
            .map((p) => p.place)
            .slice(0, 3)
            .join(", ")}`,
          ...pub("jeju", f.survey.refDate),
        }
      : dt && dt.distKm <= 0.5
        ? {
            status: "ok",
            value: `공중화장실 '${dt.name}' 장애인용 대변기 ${dt.disabled}개 (직선 ${km(dt.distKm)})`,
            ...pub("toilet", dt.refDate),
          }
        : f.facilityHints.accessibleToilet
          ? { status: "ok", value: "주요시설명에 '장애인화장실' 표기", ...pub("std", stdDate) }
          : dt
            ? {
                status: "warn",
                value: `직선 ${km(dt.distKm)} 떨어진 공중화장실 '${dt.name}'에 장애인용 대변기 ${dt.disabled}개 – 휴양림 안인지 확인 필요`,
                ...pub("toilet", dt.refDate),
              }
            : {}),
  });
  add({
    key: "toiletDistance",
    step: 4,
    label: "숙소에서 화장실까지 거리",
    groups: ["elder"],
    question: "객실 안에 화장실이 있나요? 공용 화장실이라면 숙소에서 얼마나 떨어져 있나요?",
  });
  add({
    key: "diaperNursing",
    step: 4,
    label: "기저귀 교환대·수유실",
    groups: ["child"],
    question: "기저귀 교환대나 수유실이 있나요? 어느 건물에 있나요?",
    ...(ct
      ? {
          value: `근처 공중화장실 '${ct.name}'에 어린이용 변기 ${ct.child}개 (직선 ${km(ct.distKm)}). 기저귀 교환대 정보는 공공데이터에 없음`,
          ...pub("toilet", ct.refDate),
        }
      : {}),
  });

  // ⑤ 숲길
  add({
    key: "barrierFreeTrail",
    step: 5,
    label: "무장애나눔길",
    groups: ALL,
    question: "휠체어나 유모차로 다닐 수 있는 무장애 데크길이나 평탄한 산책로가 있나요?",
    ...(nanum0 && nanum0.distKm <= 0.5
      ? {
          status: "ok",
          value: `'${nanum0.name}' ${nanum0.lengthM ? `${nanum0.lengthM.toLocaleString()}m` : ""} (${nanum0.year}년 조성, 휴양림 좌표에서 직선 ${km(nanum0.distKm)})`,
          ...pub("nanum"),
        }
      : nanum0
        ? {
            status: "warn",
            value: `직선 ${km(nanum0.distKm)} 떨어진 곳에 '${nanum0.name}' – 휴양림 안인지 확인 필요`,
            ...pub("nanum"),
          }
        : f.facilityHints.barrierFreeTrail
          ? { status: "ok", value: "주요시설명에 무장애 산책로 표기", ...pub("std", stdDate) }
          : { value: "무장애나눔길 조성정보에는 반경 3km 안에 등록된 길이 없음", ...pub("nanum") }),
  });
  const widthPts = surveyHas(/폭|경사구간|데크/);
  add({
    key: "trailDetail",
    step: 5,
    label: "숲길 경사·폭·노면",
    groups: ["wheelchair", "child"],
    question: "산책로 경사는 어느 정도인가요? 폭은 휠체어·유모차가 지나갈 만큼 넓은가요? 노면은 데크인가요, 흙길인가요?",
    ...(widthPts.length
      ? {
          status: "ok",
          value: widthPts
            .slice(0, 3)
            .map((p) => `${p.place}: ${p.detail}`)
            .join(" / "),
          ...pub("jeju", f.survey?.refDate),
        }
      : {}),
  });
  const restPts = surveyHas(/쉼터|벤치|의자/);
  add({
    key: "restArea",
    step: 5,
    label: "쉼터·벤치",
    groups: ["elder"],
    question: "산책로 중간에 쉴 수 있는 벤치나 쉼터가 얼마나 자주 있나요?",
    ...(restPts.length ? { status: "ok", value: `현장조사 쉼터·벤치 기록 ${restPts.length}곳`, ...pub("jeju", f.survey?.refDate) } : {}),
  });
  add({
    key: "kidsForest",
    step: 5,
    label: "유아숲체험원·짧은 순환코스",
    groups: ["child"],
    question: "아이와 걷기 좋은 짧은 순환 코스나 유아숲체험원이 있나요?",
    ...(kids?.inside.length
      ? {
          status: "ok",
          value: `${kids.inside.map((p) => p.name).join(", ")} (이름으로 연결, 운영기간·참여방법은 기관 확인)`,
          ...pub("kidsforest"),
        }
      : f.facilityHints.kidsForest
        ? { status: "ok", value: "주요시설명에 유아숲체험원·숲놀이터 표기", ...pub("std", stdDate) }
        : kids?.sameAreaCount
          ? {
              status: "warn",
              value: `같은 ${f.sigungu}에 유아숲체험원 ${kids.sameAreaCount}곳 (${kids.sameArea.slice(0, 2).map((p) => p.name).join(", ")}${kids.sameAreaCount > 2 ? " 등" : ""}) – 휴양림 안은 아님`,
              ...pub("kidsforest"),
            }
          : {}),
  });

  // ⑥ 안전
  add({
    key: "contact",
    step: 6,
    label: "운영 연락처",
    groups: ALL,
    question: "",
    ...(f.tel
      ? { status: "ok", value: f.tel, ...(f.telSource === "natpolicy" ? pub("natpolicy") : pub("std", stdDate)) }
      : { value: "공공데이터에 전화번호 없음 – 홈페이지 확인" }),
  });
  const aed = safety("aed");
  add({
    key: "aed",
    step: 6,
    label: "자동심장충격기(AED)",
    groups: ALL,
    question: "자동심장충격기(AED)는 어느 건물에 있나요?",
    ...(aed?.result === "예"
      ? { status: "ok", value: `월별 안전점검에서 AED 관리자 지정·점검 '예' – 설치 위치는 데이터에 없음`, ...pub("natsafety", aed.date) }
      : {}),
  });
  add({
    key: "hospital",
    step: 6,
    label: "가까운 응급실·병원",
    groups: ALL,
    question: "가장 가까운 응급실이나 병원(소아과)은 어디인가요? 차로 몇 분 걸리나요?",
  });

  // 🔵 운영자 확인 덮어쓰기
  const op = OPERATOR[f.name];
  if (op) {
    for (const it of items) {
      const o = op.items[it.key];
      if (o) {
        it.status = o.status;
        it.value = o.value;
        it.source = "operator";
        it.sourceLabel = "숲누림 운영자 전화 확인";
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
  const dt = f.toilets.find((t) => t.disabled > 0);
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
    closed: f.closed,
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
    items: items.map((it) => ({ g: groupsMask(it.groups), k: it.status === "unknown" ? 0 : 1 })),
  };
}

export function getForest(id: string) {
  return FORESTS.find((f) => f.id === id);
}
