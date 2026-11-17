export type Group = "wheelchair" | "elder" | "child" | "foreign";
export type Status = "ok" | "warn" | "no" | "unknown";
export type SourceKind = "public" | "operator" | "user";

export interface SourceInfo {
  name: string;
  org: string;
  url: string;
  refDate?: string;
  kind: string;
  license: string;
  fields: string;
  processing: string;
  usedIn: string;
  name_en?: string;
  org_en?: string;
  kind_en?: string;
  fields_en?: string;
  processing_en?: string;
  usedIn_en?: string;
  /** 공공데이터포털 데이터셋이 아닌 기관 누리집 공식 목록 ('공공데이터 N종' 집계 제외) */
  notPortal?: boolean;
}

export interface NanumMatch {
  name: string;
  year: string;
  org: string;
  address: string;
  lat: number | null;
  lng: number | null;
  lengthM: number | null;
  distKm: number;
}

export interface Room {
  name: string;
  areaM2: number | null;
  capacity: number | null;
  priceOffWeekday: number | null;
  pricePeakWeekend: number | null;
  desc: string;
  disabledPriority: boolean;
  bed: boolean;
  ondol: boolean;
  loft: boolean;
  lottery: string[];
  layoutImg?: string;
}

export interface LotteryInfo {
  rooms: string[];
  count: number;
  months: string[];
}

export type Lottery = Record<"disabled" | "multiChild" | "voucher", LotteryInfo>;

export interface NationalInfo {
  forestName: string;
  rooms: number;
  camps: number;
  disabledPriorityRooms: number;
  disabledPriorityNames: string[];
  bedRooms: number;
  bedRoomNames: string[];
  ondolRooms: number;
  loftRooms: number;
  loftRoomNames: string[];
  elevatorMentions: number;
  wheelchairMentions: number;
  parkingFreeMax: number | null;
  refDate: string;
  roomList: Room[];
  lottery: Lottery | null;
  /** 객실 설명에서 뽑은 이용수칙 (가장 많이 쓰인 값) */
  rules?: {
    checkin: string | null;
    checkinEnd: string | null;
    checkout: string | null;
    bbq: "fireSeason" | "yearRound" | null;
    idCheck: boolean;
    rooms: number;
  };
}

export interface RailStation {
  name: string;
  distKm: number;
  lat: number;
  lng: number;
}
export interface InfoCenter {
  name: string;
  addr: string;
  lang: string;
  tel: string;
  hours: string;
  off: string;
}
export interface BusStop {
  name: string;
  distKm: number;
  city: string;
  lat: number;
  lng: number;
}

export interface AseanPriority {
  rooms: string[];
  countries: { ko: string; en: string }[];
  otherRooms: string[];
  windows: { month: string; applyFrom: string; applyTo: string }[];
  tel: string;
  refDate: string;
}

export interface SurveyPoint {
  place: string;
  detail: string;
  info: string;
  lat: number | null;
  lng: number | null;
}

export interface Toilet {
  name: string;
  address: string;
  lat: number;
  lng: number;
  disabled: number;
  disabledUrinal: number;
  child: number;
  diaper: string;
  openHours: string;
  refDate: string;
  distKm: number;
}

export interface Forest {
  id: string;
  name: string;
  sido: string;
  sigungu: string;
  ownership: string;
  address: string;
  tel: string;
  telSource?: string | null;
  homepage: string;
  lat: number | null;
  lng: number | null;
  stay: boolean | null;
  capacity: number | null;
  areaM2: number | null;
  admissionFee: string;
  facilities: string[];
  institution: string;
  refDate: string;
  sources: string[];
  nanum: NanumMatch[];
  toilets: Toilet[];
  national?: NationalInfo;
  policyOnly?: Lottery | null;
  notInStd?: boolean;
  /** 표준데이터·국립 시설정보에 없어 산림청·숲나들e 공식 목록으로 보완한 휴양림 */
  listOnly?: boolean;
  /** 산림청 목록에 '미운영'으로 표시된 곳 */
  notOpen?: boolean;
  /** 좌표 출처: foresttrip(숲나들e 찾아오시는 길 지도) / osm(OpenStreetMap 검색) */
  geoSource?: "foresttrip" | "osm" | null;
  closed: boolean;
  survey?: {
    points: SurveyPoint[];
    datasetId: string;
    refDate: string;
    accessibleToilet: boolean;
  };
  facilityHints: {
    accessibleToilet: boolean;
    barrierFreeTrail: boolean;
    kidsForest: boolean;
    healing: boolean;
  };
  duplicates?: { name: string; institution: string; refDate: string }[];
  intro?: { desc: string; builtYear: string; maxCapacity: number | null; hours: string };
  layoutMap?: string;
  discounts?: Discount[];
  booking?: {
    lottery?: { from: string; to: string; avgRate: number | null; peakMonth: string; peakRate: number; monthly: { m: string; rate: number }[] };
    occupancy?: { year: string; weekday: number | null; weekend: number | null; total: number | null };
  };
  works?: { total: number; recentCount: number; lastYear: string; items: WorkItem[] };
  closures?: { count: number; items: { from: string; to: string; title: string }[] };
  safety?: { lastDate: string; items: SafetyItem[] };
  kidsPlaces?: PlaceLink;
  healingPlaces?: PlaceLink;
  busStops?: BusStop[];
  rail?: RailStation;
  infoCenters?: InfoCenter[];
  asean?: AseanPriority;
}

export interface Discount {
  target: string;
  group: string;
  offWeekday: number;
  offWeekend: number;
  peakWeekday: number;
  peakWeekend: number;
}
export interface WorkItem {
  year: string;
  title: string;
  scope: string;
  room: string;
  done: string;
  a11y: boolean;
}
export interface SafetyItem {
  key: string;
  label: string;
  result: string;
  date: string;
}
export interface Place {
  name: string;
  address: string;
  tel: string;
  sido: string;
  sigungu: string;
}
export interface PlaceLink {
  inside: Place[];
  sameArea: Place[];
  sameAreaCount: number;
}

export interface JourneyItem {
  key: string;
  step: number;
  label: string;
  groups: Group[];
  status: Status;
  source?: SourceKind;
  /** 확인된 내용(있을 때) 또는 빈칸에 대한 참고 설명 */
  value?: string;
  /** 출처 데이터셋/확인자와 기준일 */
  sourceLabel?: string;
  sourceDate?: string;
  sourceUrl?: string;
  /** 빈칸일 때 운영자에게 물어볼 질문 (화면 언어) */
  question: string;
  /** 영어 화면에서 전화로 그대로 읽거나 보여 줄 한국어 질문 */
  questionKo?: string;
  /** 온라인 자료 참고(미확인) – 상태를 바꾸지 않는 별도 표시 */
  web?: WebNote[];
}

export interface WebNote {
  item: string;
  kind: "official" | "review";
  summary: string;
  summary_en?: string;
  title: string;
  url: string;
  date: string;
}

/** 목록용 요약: 그룹별 확인도 계산에 필요한 최소 정보 */
export interface ItemSummary {
  /** 그룹 비트마스크: wheelchair=1, elder=2, child=4, foreign=8 */
  g: number;
  /** 확인됨(빈칸 아님) 여부 */
  k: 0 | 1;
}

export interface ForestSummary {
  id: string;
  name: string;
  sido: string;
  sigungu: string;
  address: string;
  ownership: string;
  lat: number | null;
  lng: number | null;
  stay: boolean | null;
  tel: string;
  homepage: string;
  closed: boolean;
  notOpen?: boolean;
  national: boolean;
  survey: boolean;
  roomCount: number;
  disabledLotteryRooms: number;
  multiChildLotteryRooms: number;
  nearestDisabledToilet: { name: string; distKm: number; count: number } | null;
  nanumNearest: { name: string; distKm: number; lengthM: number | null } | null;
  kidsForest: boolean;
  discount: boolean;
  lotteryRate: number | null;
  refDate: string;
  sourceCount: number;
  /** 가장 가까운 버스정류장 직선거리(km) */
  busNearestKm: number | null;
  asean: boolean;
  items: ItemSummary[];
}

export interface MapPoint {
  name: string;
  lat: number;
  lng: number;
}
export interface NanumPoint extends MapPoint {
  lengthM: number | null;
  year: string;
  org: string;
}
export interface ToiletPoint extends MapPoint {
  disabled: number;
  child: number;
}
