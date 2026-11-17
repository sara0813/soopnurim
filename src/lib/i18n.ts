/**
 * 한국어/영어 두 언어. 영어 화면은 /en 아래에 같은 구조로 둔다.
 * 문장은 각 화면에서 t(한국어, 영어)로 함께 적어 두 언어가 따로 놀지 않게 한다.
 */
export type Lang = "ko" | "en";

export const pick = (lang: Lang) => (ko: string, en: string) => (lang === "en" ? en : ko);

/** 언어에 맞는 내부 경로. path는 한국어 기준 경로("/", "/forest/s001" …) */
export function href(lang: Lang, path: string) {
  if (lang === "ko") return path;
  return path === "/" ? "/en" : `/en${path}`;
}

/** 현재 경로의 다른 언어 경로 */
export function counterpart(path: string) {
  if (path === "/en" || path.startsWith("/en/")) return path.slice(3) || "/";
  return path === "/" ? "/en" : `/en${path}`;
}

export const langOf = (path: string | null | undefined): Lang =>
  path && (path === "/en" || path.startsWith("/en/")) ? "en" : "ko";

/** 거리 표시 */
export function kmOf(lang: Lang, d: number) {
  if (d < 0.05) return lang === "en" ? "under 50 m" : "50m 미만";
  if (d < 1) return `${Math.round(d * 1000)}${lang === "en" ? " m" : "m"}`;
  return `${d.toFixed(1)}${lang === "en" ? " km" : "km"}`;
}

/** 공공데이터의 고정된 한국어 값(안전점검 항목, 할인 대상 등)을 영어로 */
const FIXED_EN: Record<string, string> = {
  // 휴양림 구분
  국유림: "National",
  공유림: "Public",
  사유림: "Private",
  // 안전점검
  "자동심장충격기(AED) 관리자 지정·월별 점검": "AED manager assigned, monthly check",
  "재해 시 이용객 대피 장소": "Evacuation area for disasters",
  "어린이 놀이시설 월 1회 안전검사": "Monthly playground safety inspection",
  "숲길 안내이정표·국가지점번호 관리": "Trail signposts and national location numbers maintained",
  "뱀·독충 물림 예방 조치": "Snake and insect bite prevention",
  "계단 미끄럼방지 처리": "Non-slip stairs",
  "계곡 물놀이 안전 조치": "Stream water-play safety measures",
  예: "Yes",
  아니오: "No",
  해당없음: "Not applicable",
  // 할인 대상
  국가보훈대상자: "National merit recipients",
  다자녀: "Families with many children",
  "장애인 (경증)": "Disabled (mild)",
  "장애인 (중증)": "Disabled (severe)",
  지역주민: "Local residents",
  // 이용불가 기록
  "대설ㆍ한파 대비 예약자 위약금 면제": "Cancellation fee waived (heavy snow / cold wave)",
  한파주의보: "Cold wave advisory",
  "변압기 고장으로 위약금면제": "Cancellation fee waived (transformer failure)",
};

export const fixedEn = (lang: Lang, ko: string) => (lang === "en" ? (FIXED_EN[ko] ?? ko) : ko);
