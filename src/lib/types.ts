export type Group = "wheelchair" | "elder" | "child";
export type Status = "ok" | "warn" | "no" | "unknown";
export type SourceKind = "public" | "operator" | "user";

export interface SourceInfo {
  name: string;
  org: string;
  url: string;
  refDate?: string;
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
}

export interface SurveyPoint {
  place: string;
  detail: string;
  info: string;
  lat: number | null;
  lng: number | null;
}

export interface Forest {
  id: string;
  name: string;
  sido: string;
  ownership: string;
  address: string;
  tel: string;
  homepage: string;
  lat: number | null;
  lng: number | null;
  stay: boolean | null;
  capacity: number | null;
  facilities: string[];
  institution: string;
  refDate: string;
  sources: string[];
  nanum: NanumMatch[];
  national?: NationalInfo;
  notInStd?: boolean;
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
}

export interface JourneyItem {
  key: string;
  step: number;
  label: string;
  groups: Group[];
  status: Status;
  source?: SourceKind;
  /** 확인된 내용(있을 때) */
  value?: string;
  /** 출처 데이터셋/확인자와 기준일 */
  sourceLabel?: string;
  sourceDate?: string;
  sourceUrl?: string;
  /** 빈칸일 때 운영자에게 물어볼 질문 */
  question: string;
}

/** 목록용 요약: 그룹별 확인도 계산에 필요한 최소 정보 */
export interface ItemSummary {
  /** 그룹 비트마스크: wheelchair=1, elder=2, child=4 */
  g: number;
  /** 확인됨(빈칸 아님) 여부 */
  k: 0 | 1;
}

export interface ForestSummary {
  id: string;
  name: string;
  sido: string;
  address: string;
  lat: number | null;
  lng: number | null;
  stay: boolean | null;
  tel: string;
  nanumNearest: { name: string; distKm: number; lengthM: number | null } | null;
  national: boolean;
  survey: boolean;
  notInStd: boolean;
  refDate: string;
  sourceNames: string[];
  items: ItemSummary[];
}
