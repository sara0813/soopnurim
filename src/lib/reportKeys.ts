/** 이용자 제보를 받을 수 있는 여정 항목 key (API 검증용, journey.ts와 맞춰 유지) */
export const ITEM_KEYS = [
  "parking",
  "disabledParking",
  "parkingToRoom",
  "pathStepSlope",
  "stairsHandrail",
  "stay",
  "disabledRoom",
  "disabledDiscount",
  "roomEntrance",
  "bedType",
  "indoorStairs",
  "bathroomGrab",
  "childHazard",
  "accessibleToilet",
  "toiletDistance",
  "diaperNursing",
  "barrierFreeTrail",
  "trailDetail",
  "restArea",
  "kidsForest",
  "aed",
  "hospital",
];

export const FOREST_ID = /^[sn]\d{3}$/;

/** 사진으로 확인할 수 있는 여정 항목 (렌즈가 단서를 제안하는 범위) */
export const LENS_ITEMS: { key: string; label: string; look: string }[] = [
  { key: "disabledParking", label: "장애인 주차구역", look: "장애인 주차 표지, 바닥의 휠체어 표시, 넓은 주차면" },
  { key: "pathStepSlope", label: "진입로 단차·경사·노면", look: "길의 턱, 계단, 경사로, 노면 재질(데크·자갈·흙·포장)" },
  { key: "stairsHandrail", label: "계단 손잡이", look: "계단 옆 손잡이나 난간" },
  { key: "roomEntrance", label: "객실 출입문 문턱·문 폭", look: "현관 문턱, 출입구 앞 계단이나 경사로, 문 폭" },
  { key: "bedType", label: "침대방/온돌방", look: "침대가 있는지, 바닥에 이불을 펴는 온돌방인지" },
  { key: "indoorStairs", label: "객실 안 계단(다락·복층)", look: "객실 안 계단, 다락, 복층 구조" },
  { key: "bathroomGrab", label: "욕실 안전손잡이·턱", look: "욕실 벽 손잡이, 욕실 출입 턱" },
  { key: "childHazard", label: "난간·추락 위험", look: "난간 높이와 간격, 낙차가 있는 곳" },
  { key: "accessibleToilet", label: "장애인 화장실", look: "장애인 화장실 표지, 넓은 칸, 손잡이" },
  { key: "diaperNursing", label: "기저귀 교환대·수유실", look: "기저귀 교환대, 수유실 표지" },
  { key: "trailDetail", label: "숲길 경사·폭·노면", look: "숲길의 경사, 폭, 노면 재질, 턱" },
  { key: "restArea", label: "쉼터·벤치", look: "벤치, 정자, 쉼터" },
];
