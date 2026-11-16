import type { Group } from "./types";

export const GROUPS: { id: Group; label: string; emoji: string; desc: string; bit: number }[] = [
  { id: "wheelchair", label: "휠체어 이용자", emoji: "🦽", desc: "단차·경사·장애인 객실과 화장실", bit: 1 },
  { id: "elder", label: "고령자", emoji: "👵", desc: "계단·손잡이·침대방·이동 거리", bit: 2 },
  { id: "child", label: "유아 동반", emoji: "👶", desc: "유모차 통행·기저귀 교환대·짧은 코스", bit: 4 },
];

export const groupBit = (g: Group) => GROUPS.find((x) => x.id === g)!.bit;
export const groupsMask = (gs: Group[]) => gs.reduce((m, g) => m | groupBit(g), 0);

export const STEPS = [
  { step: 1, title: "도착", desc: "주차와 하차" },
  { step: 2, title: "진입로", desc: "주차장에서 시설까지" },
  { step: 3, title: "숙소", desc: "객실 출입과 내부" },
  { step: 4, title: "화장실", desc: "위치와 설비" },
  { step: 5, title: "숲길", desc: "산책로와 쉼터" },
  { step: 6, title: "안전", desc: "연락처와 응급" },
];
