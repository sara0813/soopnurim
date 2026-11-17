import type { NextConfig } from "next";

// 같은 휴양림이 두 번 등록된 것을 합치면서 빠진 주소를 남은 쪽으로 보낸다 (scripts/build_data.py 중복 제거 참고)
const MERGED: Record<string, string> = {
  s047: "s087", // 갈모봉자연휴양림(고성) → 고성갈모봉 자연휴양림
  s063: "s000", // 도래재자연휴양림(밀양) → 밀양도래재자연휴양림
  s065: "s088", // 월아산자연휴양림(진주) → 진주 월아산 자연휴양림
  s051: "s025", // 항노화자연휴양림(항노화힐링랜드) → 거창 항노화 힐링랜드
  s128: "s127", // 방화동가족휴가촌 → 방화동자연휴양림
  k002: "s131", // 남원흥부골자연휴양림 → 흥부골자연휴양림
};

const nextConfig: NextConfig = {
  async redirects() {
    return Object.entries(MERGED).flatMap(([from, to]) => [
      { source: `/forest/${from}`, destination: `/forest/${to}`, permanent: true },
      { source: `/en/forest/${from}`, destination: `/en/forest/${to}`, permanent: true },
    ]);
  },
};

export default nextConfig;
