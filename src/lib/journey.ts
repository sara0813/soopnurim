/**
 * 산림공공데이터 → 여정 단계(①~⑥)별 확인 항목 변환.
 * 원칙: "이용 가능" 판정을 하지 않고, 항목별로 무엇이 확인됐고 무엇이 빈칸인지만 표시한다.
 */
import raw from "@/data/forests.json";
import operatorRaw from "@/data/operator_checks.json";
import type { Forest, ForestSummary, Group, JourneyItem, SourceInfo, Status } from "./types";
import { groupsMask } from "./groups";

export const SOURCES = raw.sources as Record<string, SourceInfo>;
export const FORESTS = raw.forests as unknown as Forest[];

type OperatorEntry = { checkedAt: string; items: Record<string, { status: Status; value: string }> };
const OPERATOR = Object.fromEntries(
  Object.entries(operatorRaw as Record<string, unknown>).filter(([k]) => !k.startsWith("_")),
) as Record<string, OperatorEntry>;

const ALL: Group[] = ["wheelchair", "elder", "child"];

function pub(key: "std" | "nanum" | "natfac" | "jeju", f?: Forest) {
  const s = SOURCES[key];
  const date = key === "std" ? f?.refDate : key === "jeju" ? f?.survey?.refDate : s.refDate;
  return { source: "public" as const, sourceLabel: s.name, sourceDate: date, sourceUrl: s.url };
}

const km = (d: number) => (d < 0.05 ? "50m 미만" : d < 1 ? `${Math.round(d * 1000)}m` : `${d.toFixed(1)}km`);

export function buildJourney(f: Forest): JourneyItem[] {
  const n = f.national;
  const nanum0 = f.nanum[0];
  const pts = f.survey?.points ?? [];
  const surveyHas = (re: RegExp) => pts.filter((p) => re.test(p.detail) || re.test(p.info));

  const items: JourneyItem[] = [];
  const add = (it: Omit<JourneyItem, "status"> & { status?: Status }) =>
    items.push({ status: "unknown", ...it } as JourneyItem);

  // ① 도착
  add({
    key: "parking",
    step: 1,
    label: "주차장 규모",
    groups: ALL,
    question: "주차장은 몇 대 정도 주차할 수 있나요? 성수기에도 자리가 있나요?",
    ...(n?.parkingFreeMax
      ? { status: "ok", value: `객실당 무료 주차 최대 ${n.parkingFreeMax}대 (전체 주차장 규모는 미표기)`, ...pub("natfac") }
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
    question: "주차장에서 숙소까지 걸어서 몇 분 정도인가요? 숙소 앞까지 차가 들어갈 수 있나요?",
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
          ...pub("jeju", f),
        }
      : {}),
  });
  add({
    key: "stairsHandrail",
    step: 2,
    label: "계단 손잡이",
    groups: ["elder"],
    question: "숙소나 화장실로 가는 길의 계단에 손잡이가 있나요?",
  });

  // ③ 숙소
  if (f.stay === false) {
    add({
      key: "stay",
      step: 3,
      label: "숙박 가능 여부",
      groups: ALL,
      status: "no",
      value: "숙박시설 없음 (당일 방문)",
      question: "",
      ...pub("std", f),
    });
  } else {
    add({
      key: "stay",
      step: 3,
      label: "숙박 가능 여부",
      groups: ALL,
      question: "숙박할 수 있는 객실이 있나요?",
      ...(n?.rooms
        ? { status: "ok", value: `숙박 객실 ${n.rooms}실, 야영 ${n.camps}면`, ...pub("natfac") }
        : f.stay
          ? { status: "ok", value: "숙박 가능", ...pub("std", f) }
          : {}),
    });
  }
  const hasRooms = f.stay !== false;
  if (hasRooms) {
    add({
      key: "disabledRoom",
      step: 3,
      label: "장애인 객실",
      groups: ["wheelchair"],
      question: "장애인 객실(또는 장애인 우선예약 객실)이 있나요? 몇 실인가요?",
      ...(n && n.disabledPriorityRooms > 0
        ? {
            status: "ok",
            value: `장애인 우선예약 객실 ${n.disabledPriorityRooms}실 (${n.disabledPriorityNames.slice(0, 3).join(", ")}${n.disabledPriorityRooms > 3 ? " 등" : ""})`,
            ...pub("natfac"),
          }
        : n
          ? { value: "국립휴양림 객실 설명에 장애인 객실 표기 없음" }
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
        ? {
            status: "ok",
            value: `객실 설명에 침대 언급 ${n.bedRooms}실 (${n.bedRoomNames.slice(0, 3).join(", ")})`,
            ...pub("natfac"),
          }
        : n
          ? { value: `객실 설명에 침대 언급 없음 (온돌 언급 ${n.ondolRooms}실)` }
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
    });
  }

  // ④ 화장실
  const surveyToilet = f.survey?.accessibleToilet;
  add({
    key: "accessibleToilet",
    step: 4,
    label: "장애인 화장실",
    groups: ["wheelchair"],
    question: "장애인 화장실이 있나요? 객실 안인가요, 관리동이나 공용 화장실인가요?",
    ...(surveyToilet
      ? {
          status: "ok",
          value: `현장조사: ${surveyHas(/장애인화장실/)
            .map((p) => p.place)
            .slice(0, 3)
            .join(", ")}`,
          ...pub("jeju", f),
        }
      : f.facilityHints.accessibleToilet
        ? { status: "ok", value: "주요시설명에 '장애인화장실' 표기", ...pub("std", f) }
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
          value: `'${nanum0.name}' ${nanum0.lengthM ? `${nanum0.lengthM.toLocaleString()}m` : ""} (${nanum0.year}년 조성, 직선 ${km(nanum0.distKm)})`,
          ...pub("nanum"),
        }
      : nanum0
        ? {
            status: "warn",
            value: `직선 ${km(nanum0.distKm)} 떨어진 곳에 '${nanum0.name}' – 휴양림 안인지 확인 필요`,
            ...pub("nanum"),
          }
        : f.facilityHints.barrierFreeTrail
          ? { status: "ok", value: "주요시설명에 무장애 산책로 표기", ...pub("std", f) }
          : // 데이터에 없다는 것은 '없음'이 확인된 것이 아니므로 빈칸으로 둔다
            { value: "무장애나눔길 조성정보 데이터에는 반경 3km 안에 등록된 길이 없음" }),
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
          ...pub("jeju", f),
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
    ...(restPts.length
      ? { status: "ok", value: `현장조사 쉼터·벤치 기록 ${restPts.length}곳`, ...pub("jeju", f) }
      : {}),
  });
  add({
    key: "kidsForest",
    step: 5,
    label: "유아숲체험원·짧은 순환코스",
    groups: ["child"],
    question: "아이와 걷기 좋은 짧은 순환 코스나 유아숲체험원이 있나요?",
    ...(f.facilityHints.kidsForest
      ? { status: "ok", value: "주요시설명에 유아숲체험원·숲놀이터 표기", ...pub("std", f) }
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
      ? { status: "ok", value: f.tel, ...pub("std", f) }
      : { value: "공공데이터에 전화번호 없음 – 홈페이지(숲나들e) 확인" }),
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
  return items;
}

export function relevant(items: JourneyItem[], groups: Group[]) {
  if (!groups.length) return items;
  return items.filter((it) => it.groups.some((g) => groups.includes(g)));
}

export function summarize(f: Forest): ForestSummary {
  const items = buildJourney(f);
  const n0 = f.nanum[0];
  return {
    id: f.id,
    name: f.name,
    sido: f.sido,
    address: f.address,
    lat: f.lat,
    lng: f.lng,
    stay: f.stay,
    tel: f.tel,
    nanumNearest: n0 ? { name: n0.name, distKm: n0.distKm, lengthM: n0.lengthM } : null,
    national: !!f.national,
    survey: !!f.survey,
    notInStd: !!f.notInStd,
    refDate: f.refDate,
    sourceNames: f.sources.map((s) => SOURCES[s]?.name ?? s),
    items: items.map((it) => ({ g: groupsMask(it.groups), k: it.status === "unknown" ? 0 : 1 })),
  };
}

export function getForest(id: string) {
  return FORESTS.find((f) => f.id === id);
}
