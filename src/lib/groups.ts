import type { Group } from "./types";

export const GROUPS: { id: Group; label: string; label_en: string; desc: string; desc_en: string; bit: number }[] = [
  { id: "wheelchair", label: "휠체어 이용자", label_en: "Wheelchair user", desc: "단차·경사, 장애인 객실과 화장실", desc_en: "Steps, slopes, accessible rooms and toilets", bit: 1 },
  { id: "elder", label: "고령자", label_en: "Older adult", desc: "계단·손잡이, 침대방, 이동 거리", desc_en: "Stairs, handrails, beds, walking distance", bit: 2 },
  { id: "child", label: "유아 동반", label_en: "With young children", desc: "유모차 통행, 기저귀 교환대, 짧은 코스", desc_en: "Strollers, diaper stations, short trails", bit: 4 },
  { id: "foreign", label: "외국인 여행자", label_en: "Foreign visitor", desc: "예약·결제, 대중교통, 이용수칙", desc_en: "Booking and payment, transit, house rules", bit: 8 },
];

/** 보행약자 세 유형. 아무 유형도 고르지 않았을 때 한국어 화면의 기본 범위 (기존 통계와 맞춤) */
export const ACCESS_MASK = 1 | 2 | 4;
export const ALL_MASK = 1 | 2 | 4 | 8;

export const groupBit = (g: Group) => GROUPS.find((x) => x.id === g)!.bit;
export const groupsMask = (gs: Group[]) => gs.reduce((m, g) => m | groupBit(g), 0);

export const STEPS = [
  { step: 1, title: "예약", title_en: "Booking", desc: "가입·결제·우선예약", desc_en: "Sign-up, payment, priority booking" },
  { step: 2, title: "도착", title_en: "Arrival", desc: "주차와 대중교통", desc_en: "Parking and public transport" },
  { step: 3, title: "진입로", title_en: "Access path", desc: "주차장에서 시설까지", desc_en: "From parking to facilities" },
  { step: 4, title: "숙소", title_en: "Lodging", desc: "객실 출입과 내부", desc_en: "Room entrance and interior" },
  { step: 5, title: "화장실", title_en: "Toilets", desc: "위치와 설비", desc_en: "Location and fittings" },
  { step: 6, title: "숲길", title_en: "Trails", desc: "산책로와 쉼터", desc_en: "Walking paths and rest areas" },
  { step: 7, title: "안전", title_en: "Safety", desc: "연락처·응급·이용수칙", desc_en: "Contacts, emergencies, rules" },
];
