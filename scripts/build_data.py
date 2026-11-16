"""
숲누림 데이터 가공 스크립트
- 입력: data/raw/ 의 산림공공데이터 원본
- 출력: src/data/forests.json (앱 번들용), src/data/stats.json (빈칸 통계),
        data/analysis/report.md (결측률·매칭 결과·개선 의견 로그 근거)

실행: python -I scripts/build_data.py   (프로젝트 루트에서)
"""
import csv
import json
import math
import os
import re
import sys
from collections import Counter, defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, "data", "raw")
OUT_APP = os.path.join(ROOT, "src", "data")
OUT_ANALYSIS = os.path.join(ROOT, "data", "analysis")

# ---------------------------------------------------------------- 출처 정의
SOURCES = {
    "std": {
        "name": "전국휴양림표준데이터",
        "org": "산림청 외 각 지자체(공공데이터 개방표준)",
        "url": "https://www.data.go.kr/data/15013111/standard.do",
    },
    "nanum": {
        "name": "한국산림복지진흥원_무장애나눔길 조성정보",
        "org": "한국산림복지진흥원",
        "url": "https://www.data.go.kr/data/15063418/fileData.do",
        "refDate": "2025-12-31",
    },
    "natfac": {
        "name": "산림청 국립자연휴양림관리소_국립자연휴양림 시설관련 정보",
        "org": "산림청 국립자연휴양림관리소",
        "url": "https://www.data.go.kr/data/15064419/fileData.do",
        "refDate": "2023-05-24",
    },
    "jeju": {
        "name": "제주특별자치도_무장애여행정보",
        "org": "제주특별자치도",
        "url": "https://www.data.go.kr/data/15075196/fileData.do",
        "refDate": "2020-12-22",
    },
}


def haversine(la1, lo1, la2, lo2):
    p = math.pi / 180
    a = math.sin((la2 - la1) * p / 2) ** 2 + math.cos(la1 * p) * math.cos(la2 * p) * math.sin((lo2 - lo1) * p / 2) ** 2
    return 6371 * 2 * math.asin(math.sqrt(a))


def fnum(x):
    try:
        v = float(str(x).replace(",", "").strip())
        return v if v == v else None
    except (TypeError, ValueError):
        return None


def norm_name(s):
    s = re.sub(r"\(.*?\)|\s|국립|자연휴양림|휴양림|산림욕장", "", s or "")
    return s


def split_facilities(s):
    parts = re.split(r"[+,/·]", s or "")
    return [p.strip() for p in parts if p.strip()]


# ---------------------------------------------------------------- 1. 원본 읽기
std = json.load(open(os.path.join(RAW, "forest_std.json"), encoding="utf-8"))
STD_HEADER, STD_ROWS = std["header"], std["rows"]
nanum_rows = list(csv.DictReader(open(os.path.join(RAW, "nanumgil.csv"), encoding="cp949")))
nat_rows = list(csv.DictReader(open(os.path.join(RAW, "extra", "15064419.csv"), encoding="utf-8-sig")))
jeju_files = {
    "붉은오름자연휴양림": ("15075170", os.path.join(RAW, "extra", "15075170.csv")),
    "서귀포자연휴양림": ("15075196", os.path.join(RAW, "extra", "15075196.csv")),
}

report = []  # 분석 리포트 라인
improve_log = []  # 개선 의견 로그


def log_issue(dataset, problem, impact, proposal):
    improve_log.append({"dataset": dataset, "problem": problem, "impact": impact, "proposal": proposal})


# ---------------------------------------------------------------- 2. 표준데이터 결측률
report.append("## 1. 전국휴양림표준데이터 필드별 결측률\n")
report.append(f"- 전체 {len(STD_ROWS)}건 (data.go.kr/15013111 다운로드 기준)\n")
report.append("| 필드 | 결측 | 비율 |\n|---|---|---|")
for c in STD_HEADER:
    k = c["columCode"]
    miss = sum(not str(r.get(k) or "").strip() for r in STD_ROWS)
    report.append(f"| {c['columNm']} | {miss} | {miss / len(STD_ROWS):.1%} |")
report.append("")
report.append(
    "> 표준데이터 필드 17개 중 접근성(무장애) 관련 필드는 **0개**. "
    "'주요시설명' 자유서술 텍스트에서만 일부 단서를 얻을 수 있음.\n"
)
log_issue(
    "전국휴양림표준데이터",
    "표준 필드 17개 중 무장애(문턱·경사·장애인 객실·화장실 등) 관련 필드가 없음",
    "보행약자가 여정 단계별로 이용 가능 여부를 판단할 근거가 없음",
    "무장애 상세 필드 추가(제안 1)",
)

# 기준일 분포
ref_years = Counter((r.get("REFERENCE_DATE") or "")[:4] for r in STD_ROWS)
report.append("### 데이터기준일자 연도 분포\n")
report.append(", ".join(f"{y}년 {c}건" for y, c in sorted(ref_years.items())))
report.append("")

# ---------------------------------------------------------------- 3. 휴양림 레코드 구성
forests = []
for i, r in enumerate(STD_ROWS):
    la, lo = fnum(r.get("LATITUDE")), fnum(r.get("LONGITUDE"))
    forests.append(
        {
            "id": f"s{i:03d}",
            "name": r["RCRFRST_NM"].strip(),
            "sido": r.get("CTPRVN_NM", "").strip(),
            "ownership": r.get("RCRFRST_TYPE", "").strip(),
            "address": r.get("RDNMADR", "").strip(),
            "tel": (r.get("TELEPHONE_NUMBER") or "").strip(),
            "homepage": (r.get("HOMEPAGE_URL") or "").strip(),
            "lat": la,
            "lng": lo,
            "stay": {"Y": True, "N": False}.get((r.get("STAYNG_POSBL_YN") or "").strip()),
            "capacity": fnum(r.get("ACEPTNC_CO")),
            "facilities": split_facilities(r.get("MAIN_FCLTY_NM")),
            "institution": (r.get("INSTITUTION_NM") or "").strip(),
            "refDate": (r.get("REFERENCE_DATE") or "").strip(),
            "sources": ["std"],
        }
    )

# 중복 제거: 정규화 이름이 같고 2km 이내면 같은 휴양림 → 기준일이 최신인 레코드만 남김
groups = []
for f in forests:
    for g in groups:
        h = g[0]
        if norm_name(h["name"]) == norm_name(f["name"]) and f["lat"] and h["lat"] and haversine(f["lat"], f["lng"], h["lat"], h["lng"]) < 2:
            g.append(f)
            break
    else:
        groups.append([f])
dups = [g for g in groups if len(g) > 1]
forests = []
for g in groups:
    g.sort(key=lambda f: (f["refDate"], len(f["tel"]) > 0, len(f["facilities"])), reverse=True)
    keep = g[0]
    if len(g) > 1:
        keep["duplicates"] = [{"name": d["name"], "institution": d["institution"], "refDate": d["refDate"]} for d in g[1:]]
        # 최신 레코드에 비어 있는 값은 중복 레코드에서 보완
        for d in g[1:]:
            for k in ["tel", "homepage", "address"]:
                if not keep[k] and d[k]:
                    keep[k] = d[k]
    forests.append(keep)
report.append("### 중복 레코드 (정규화 이름 동일 + 2km 이내)" + chr(10))
for g in dups:
    report.append("- " + " / ".join(f"{d['name']}({d['institution']}, {d['refDate']})" for d in g))
report.append(chr(10) + f"→ {sum(len(g) - 1 for g in dups)}건 제거, 기준일 최신 레코드 유지 (표준데이터 {len(STD_ROWS)}건 → {len(forests)}곳)" + chr(10))
log_issue(
    "전국휴양림표준데이터",
    f"같은 휴양림이 시·군과 시·도 등 여러 제공기관에서 중복 등록됨 ({len(dups)}곳, {sum(len(g) - 1 for g in dups)}건)",
    "목록·지도에 같은 숲이 두 번 나타나고, 기준일이 다른 정보가 서로 충돌",
    "휴양림 고유 ID(지정번호) 필드 추가, 제공기관 간 중복 등록 정리",
)
STD_UNIQUE = len(forests)

# ---------------------------------------------------------------- 4. 국립자연휴양림 시설정보 결합
nat_by_forest = defaultdict(list)
for p in nat_rows:
    nat_by_forest[p["기관명"].strip()].append(p)

ROOM_KW = {
    "disabledPriority": r"장애인\s*우선\s*예약|장애인\s*객실|장애인실",
    "bed": r"침대",
    "ondol": r"온돌",
    "loft": r"다락|복층|2층|계단",
    "elevator": r"엘리베이터|승강기",
    "wheelchair": r"휠체어|경사로",
}

# 국립휴양림 시설정보 이름 → 표준데이터 이름(정규화) 수동 별칭
NAME_ALIAS = {"희리산": "희리산해송"}

nat_matched, nat_added = [], []
for fname, prods in nat_by_forest.items():
    rooms = [p for p in prods if p["상품구분"] == "숙박"]
    camps = [p for p in prods if p["상품구분"] == "야영"]
    coords = [(fnum(p["상품위치위도"]), fnum(p["상품위치경도"])) for p in prods]
    coords = [(a, b) for a, b in coords if a and b and 33 < a < 39 and 124 < b < 132]
    # 일부 레코드는 위경도 순서가 뒤바뀜 → 보정
    if not coords:
        coords = [(fnum(p["상품위치경도"]), fnum(p["상품위치위도"])) for p in prods]
        coords = [(a, b) for a, b in coords if a and b and 33 < a < 39 and 124 < b < 132]
    cla = sum(a for a, _ in coords) / len(coords) if coords else None
    clo = sum(b for _, b in coords) / len(coords) if coords else None

    def count(kw):
        return sum(bool(re.search(ROOM_KW[kw], p["상품설명"])) for p in rooms)

    def names(kw, limit=6):
        return [p["상품명"].strip() for p in rooms if re.search(ROOM_KW[kw], p["상품설명"])][:limit]

    park_free = [fnum(p["무료주차가능대수"]) for p in prods if fnum(p["무료주차가능대수"]) is not None]
    park_max = [fnum(p["최대주차가능대수"]) for p in prods if fnum(p["최대주차가능대수"]) is not None]
    natinfo = {
        "forestName": fname,
        "rooms": len(rooms),
        "camps": len(camps),
        "disabledPriorityRooms": count("disabledPriority"),
        "disabledPriorityNames": names("disabledPriority"),
        "bedRooms": count("bed"),
        "bedRoomNames": names("bed"),
        "ondolRooms": count("ondol"),
        "loftRooms": count("loft"),
        "loftRoomNames": names("loft"),
        "elevatorMentions": count("elevator"),
        "wheelchairMentions": count("wheelchair"),
        "parkingFreeMax": max(park_free) if park_free else None,
        "refDate": SOURCES["natfac"]["refDate"],
    }

    # 매칭: 이름 정규화 일치 또는 좌표 1.5km 이내 + 이름 일부 일치
    target = None
    nn = norm_name(fname)
    for f in forests:
        fn = norm_name(f["name"])
        near = cla is not None and f["lat"] is not None and haversine(cla, clo, f["lat"], f["lng"]) < 3
        # 정규화한 이름이 정확히 같고 3km 이내일 때만 같은 휴양림으로 본다.
        # (부분 일치는 '속리산 말티재' ↔ '속리산 숲체험휴양마을'처럼 다른 시설을 잘못 묶으므로 별칭표로만 허용)
        if (fn == nn or NAME_ALIAS.get(nn) == fn) and (near or cla is None):
            target = f
            break

    if target is not None:
        target["national"] = natinfo
        target["sources"].append("natfac")
        nat_matched.append((fname, target["name"]))
    else:
        addr = Counter(p["주소"].strip() for p in prods if p["주소"].strip()).most_common(1)
        home = Counter(p["홈페이지주소"].strip() for p in prods if p["홈페이지주소"].strip()).most_common(1)
        region = Counter(p["지역"].strip() for p in prods if p["지역"].strip()).most_common(1)
        forests.append(
            {
                "id": f"n{len(nat_added):03d}",
                "name": fname.replace(" 자연휴양림", "자연휴양림").replace(" 야영장", "야영장"),
                "sido": region[0][0] if region else "",
                "ownership": "국유림",
                "address": addr[0][0] if addr else "",
                "tel": "",
                "homepage": home[0][0] if home else "",
                "lat": cla,
                "lng": clo,
                "stay": True if rooms else None,
                "capacity": None,
                "facilities": [],
                "institution": "산림청 국립자연휴양림관리소",
                "refDate": SOURCES["natfac"]["refDate"],
                "sources": ["natfac"],
                "national": natinfo,
                "notInStd": True,
            }
        )
        nat_added.append(fname)

report.append("## 2. 국립자연휴양림 시설관련 정보 결합\n")
report.append(f"- 상품 {len(nat_rows)}건 (숙박 {sum(p['상품구분']=='숙박' for p in nat_rows)}, "
              f"야영 {sum(p['상품구분']=='야영' for p in nat_rows)}, 부대시설 {sum(p['상품구분']=='부대시설' for p in nat_rows)}), "
              f"휴양림 {len(nat_by_forest)}곳")
report.append(f"- 표준데이터와 매칭: {len(nat_matched)}곳")
report.append(f"- **표준데이터에 없는 국립자연휴양림: {len(nat_added)}곳** → 시설정보 데이터로 보완 추가")
report.append("  - " + ", ".join(nat_added))
report.append("")
log_issue(
    "전국휴양림표준데이터 ↔ 국립자연휴양림 시설관련 정보",
    f"국립자연휴양림 {len(nat_by_forest)}곳 중 {len(nat_added)}곳이 전국휴양림표준데이터에 없음",
    "표준데이터만 쓰면 이용자가 많은 국립휴양림 상당수가 검색되지 않음",
    "국립자연휴양림관리소 운영 휴양림을 표준데이터에 포함, 두 데이터에 공통 휴양림 ID 부여",
)

log_issue(
    "국립자연휴양림 시설관련 정보",
    "전화번호 필드가 없고, 주차는 객실(상품)당 대수만 있어 전체 주차장·장애인 주차구역 규모를 알 수 없음",
    f"표준데이터에 없는 국립휴양림 {len(nat_added)}곳은 공공데이터만으로 운영기관에 연락할 수 없음",
    "휴양림 단위 대표 전화번호, 전체·장애인 주차면 수 필드 추가",
)

rooms_all = [p for p in nat_rows if p["상품구분"] == "숙박"]
kw_table = [
    ("장애인 우선예약/객실", ROOM_KW["disabledPriority"]),
    ("침대", r"침대"),
    ("온돌", r"온돌"),
    ("다락·복층·2층·계단", ROOM_KW["loft"]),
    ("휠체어·경사로", ROOM_KW["wheelchair"]),
    ("엘리베이터", ROOM_KW["elevator"]),
    ("문턱", r"문턱"),
    ("안전손잡이", r"안전\s*손잡이|핸드레일"),
    ("유모차", r"유모차"),
    ("기저귀·수유", r"기저귀|수유"),
]
report.append("### 숙박 객실 설명(자유서술) 키워드 언급 객실 수\n")
report.append(f"전체 숙박 객실 {len(rooms_all)}실 기준\n")
report.append("| 키워드 | 언급 객실 | 비율 |\n|---|---|---|")
kw_stats = []
for label, pat in kw_table:
    c = sum(bool(re.search(pat, p["상품설명"])) for p in rooms_all)
    kw_stats.append({"label": label, "count": c, "total": len(rooms_all)})
    report.append(f"| {label} | {c} | {c / len(rooms_all):.1%} |")
report.append("")
log_issue(
    "국립자연휴양림 시설관련 정보",
    "객실 무장애 정보가 '상품설명' 자유서술에만 있고, 문턱·안전손잡이·유모차 관련 언급 객실은 0실",
    "텍스트 분석으로도 객실 출입·욕실 안전 여부를 알 수 없음",
    "객실 단위 구조화 필드(출입구 단차, 문 폭, 침대/온돌, 욕실 손잡이) 추가",
)

# ---------------------------------------------------------------- 5. 무장애나눔길 좌표 매칭
nanum = []
for r in nanum_rows:
    la, lo = fnum(r["위도(도)"]), fnum(r["경도(도)"])
    nanum.append(
        {
            "name": r["사업명"].strip(),
            "year": r["조성연도"].strip(),
            "org": r["관리기관"].strip(),
            "address": r["주소"].strip(),
            "lat": la,
            "lng": lo,
            "lengthM": fnum(r["조성길이(m)"]),
        }
    )
NEAR_KM = 3.0
dist_hist = Counter()
for f in forests:
    if f["lat"] is None:
        f["nanum"] = []
        continue
    cand = []
    for n in nanum:
        if n["lat"] is None:
            continue
        d = haversine(f["lat"], f["lng"], n["lat"], n["lng"])
        if d <= NEAR_KM:
            cand.append({**n, "distKm": round(d, 2)})
    cand.sort(key=lambda x: x["distKm"])
    f["nanum"] = cand[:3]
    if f["nanum"]:
        f["sources"].append("nanum")
        d0 = f["nanum"][0]["distKm"]
        dist_hist["0.5km 이내" if d0 <= 0.5 else "0.5~1km" if d0 <= 1 else "1~3km"] += 1
    else:
        dist_hist["3km 내 없음"] += 1

report.append("## 3. 무장애나눔길 ↔ 휴양림 좌표 매칭\n")
report.append(f"- 무장애나눔길 {len(nanum)}곳, 휴양림 {len(forests)}곳 (공통 ID 없음 → 직선거리 매칭)")
for k in ["0.5km 이내", "0.5~1km", "1~3km", "3km 내 없음"]:
    report.append(f"- 가장 가까운 나눔길 {k}: {dist_hist[k]}곳")
report.append("")
log_issue(
    "무장애나눔길 조성정보 ↔ 전국휴양림표준데이터",
    "두 데이터 간 공통 ID가 없어 좌표 직선거리로만 연결 가능",
    "휴양림 안 나눔길인지 인근 공원 나눔길인지 구분 불가",
    "무장애나눔길 데이터에 '연계 휴양림 ID' 필드 추가(제안 2)",
)
nanum_missing = {
    k: sum(not (r.get(k) or "").strip() for r in nanum_rows) for k in nanum_rows[0].keys()
}
report.append("### 무장애나눔길 필드 목록과 결측\n")
report.append(", ".join(f"{k}(결측 {v})" for k, v in nanum_missing.items()))
report.append("")
report.append("> 경사도·노면·유효폭·쉼터·화장실 필드 없음 → 휠체어 이용자가 길 난이도를 판단할 수 없음\n")
log_issue(
    "무장애나눔길 조성정보",
    "필드가 연번·연도·기관·사업명·주소·좌표·길이 8개뿐, 경사도·노면·폭 없음",
    "'무장애'라는 이름만으로 실제 휠체어 주행 가능 여부 판단 불가",
    "평균·최대 경사, 노면 재질, 유효 폭, 쉼터 간격, 화장실 유무 필드 추가(제안 2)",
)

# ---------------------------------------------------------------- 6. 제주 무장애여행정보(현장조사) 결합
for fname, (pk, path) in jeju_files.items():
    rows = list(csv.DictReader(open(path, encoding="cp949")))
    pts = []
    for r in rows:
        pts.append(
            {
                "place": r["장소명칭"].strip(),
                "detail": "" if r["장소상세정보"].strip() == "특이사항없음" else r["장소상세정보"].strip(),
                "info": "" if r["무장애관광정보"].strip() == "특이사항없음" else r["무장애관광정보"].strip(),
                "lat": fnum(r["위도"]),
                "lng": fnum(r["경도"]),
            }
        )
    pts = [p for p in pts if p["detail"] or p["info"]]
    for f in forests:
        if norm_name(f["name"]) == norm_name(fname):
            f["survey"] = {
                "points": pts,
                "datasetId": pk,
                "refDate": SOURCES["jeju"]["refDate"],
                "accessibleToilet": any("장애인화장실" in p["info"] for p in pts),
            }
            f["sources"].append("jeju")

# ---------------------------------------------------------------- 7. 주요시설명 키워드 → 단서
FAC_KW = {
    "accessibleToilet": r"장애인\s*화장실",
    "barrierFreeTrail": r"무장애|나눔길|데크로드|무장애데크",
    "kidsForest": r"유아숲|숲놀이터|유아숲체험원",
    "healing": r"치유",
}
for f in forests:
    txt = " ".join(f["facilities"])
    f["facilityHints"] = {k: bool(re.search(p, txt)) for k, p in FAC_KW.items()}

hint_counts = {k: sum(f["facilityHints"][k] for f in forests) for k in FAC_KW}
report.append("## 4. '주요시설명' 텍스트 키워드 추출 결과\n")
for k, v in hint_counts.items():
    report.append(f"- {k}: {v}곳")
report.append("")

# ---------------------------------------------------------------- 8. 정렬 및 저장
forests.sort(key=lambda f: (f["sido"], f["name"]))
os.makedirs(OUT_APP, exist_ok=True)
os.makedirs(OUT_ANALYSIS, exist_ok=True)

json.dump(
    {"sources": SOURCES, "forests": forests, "nanumAll": [{k: n[k] for k in ("name", "lat", "lng", "lengthM", "year", "org")} for n in nanum if n["lat"]]},
    open(os.path.join(OUT_APP, "forests.json"), "w", encoding="utf-8"),
    ensure_ascii=False,
    separators=(",", ":"),
)

stats = {
    "stdRows": len(STD_ROWS),
    "stdUnique": STD_UNIQUE,
    "stdDuplicates": len(STD_ROWS) - STD_UNIQUE,
    "nationalForests": len(nat_by_forest),
    "nationalNotInStd": len(nat_added),
    "nanumCount": len(nanum),
    "forestTotal": len(forests),
    "nanumMatch": dict(dist_hist),
    "roomKeywordStats": kw_stats,
    "facilityHints": hint_counts,
    "datasetsUsed": len(SOURCES),
    "improveLog": improve_log,
}
json.dump(stats, open(os.path.join(OUT_APP, "stats.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

with open(os.path.join(OUT_ANALYSIS, "report.md"), "w", encoding="utf-8") as fp:
    fp.write("# 숲누림 데이터 분석 리포트 (자동 생성)\n\n")
    fp.write("생성: scripts/build_data.py\n\n")
    fp.write("\n".join(report))
    fp.write("\n## 5. 개선 의견 로그 (자동 기록분)\n\n| 데이터셋 | 문제 | 영향 | 개선 제안 |\n|---|---|---|---|\n")
    for it in improve_log:
        fp.write(f"| {it['dataset']} | {it['problem']} | {it['impact']} | {it['proposal']} |\n")

print(f"forests={len(forests)} (std {len(STD_ROWS)}→{STD_UNIQUE} + national-only {len(nat_added)}), "
      f"nat matched={len(nat_matched)}, nanum match={dict(dist_hist)}")
print("matched:", nat_matched)
