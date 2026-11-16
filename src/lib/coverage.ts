/** 정보 확인도: 선택한 이용자 유형에 필요한 항목 중 출처 있는 정보가 채워진 비율 (접근성 점수 아님) */
export function coverage(items: { k: 0 | 1; g: number }[], mask: number) {
  const rel = mask ? items.filter((i) => i.g & mask) : items;
  const known = rel.filter((i) => i.k).length;
  return { known, total: rel.length };
}
