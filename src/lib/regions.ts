/**
 * 시·도 표시 순서와 줄임 이름.
 * 순서는 행정표준코드(법정동코드)의 시·도 순서를 따른다: 특별시·광역시 → 도 → 제주.
 * 휴양림이 없는 시·도(서울·세종 등)도 목록에 보여 주고 0곳으로 표시한다.
 */
export const SIDO = [
  { name: "서울특별시", short: "서울" },
  { name: "부산광역시", short: "부산" },
  { name: "대구광역시", short: "대구" },
  { name: "인천광역시", short: "인천" },
  { name: "광주광역시", short: "광주" },
  { name: "대전광역시", short: "대전" },
  { name: "울산광역시", short: "울산" },
  { name: "세종특별자치시", short: "세종" },
  { name: "경기도", short: "경기" },
  { name: "강원특별자치도", short: "강원" },
  { name: "충청북도", short: "충북" },
  { name: "충청남도", short: "충남" },
  { name: "전북특별자치도", short: "전북" },
  { name: "전남광주통합특별시", short: "전남·광주" },
  { name: "전라남도", short: "전남" },
  { name: "경상북도", short: "경북" },
  { name: "경상남도", short: "경남" },
  { name: "제주특별자치도", short: "제주" },
] as const;

const RANK = new Map<string, number>(SIDO.map((s, i) => [s.name, i]));
const SHORT = new Map<string, string>(SIDO.map((s) => [s.name, s.short]));

/** 표준 순서에서의 위치. 목록에 없는 이름은 맨 뒤. */
export const sidoRank = (name: string) => RANK.get(name) ?? SIDO.length;
export const sidoShort = (name: string) => SHORT.get(name) ?? name;

/**
 * 선택 목록에 보일 시·도: 데이터에 있는 시·도 + 표준 목록.
 * 통합 이후 없어진 이름(광주광역시·전라남도)은 데이터에 없으면 빼서 같은 곳이 두 번 보이지 않게 한다.
 */
export function sidoOptions(counts: Map<string, number>) {
  const merged = counts.has("전남광주통합특별시");
  const names = new Set<string>([
    ...SIDO.map((s) => s.name).filter((n) => !(merged && (n === "광주광역시" || n === "전라남도")) || counts.has(n)),
    ...counts.keys(),
  ]);
  if (!merged) names.delete("전남광주통합특별시");
  return [...names]
    .sort((a, b) => sidoRank(a) - sidoRank(b) || a.localeCompare(b, "ko"))
    .map((name) => ({ name, short: sidoShort(name), count: counts.get(name) ?? 0 }));
}
