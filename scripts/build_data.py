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
# 화면(/data)에 그대로 표시되므로 필드·가공·쓰임새를 정확히 적는다.
LICENSE = "공공데이터포털 이용허락범위 제한 없음"
SOURCES = {
    "std": {
        "name": "전국휴양림표준데이터",
        "org": "산림청 및 시·도, 시·군·구 (공공데이터 개방표준)",
        "url": "https://www.data.go.kr/data/15013111/standard.do",
        "kind": "산림 · 표준데이터",
        "license": LICENSE,
        "fields": "휴양림명, 시도명, 휴양림구분, 수용인원수, 입장료, 숙박가능여부, 주요시설명, 소재지도로명주소, 관리기관명, 휴양림전화번호, 홈페이지주소, 위도, 경도, 데이터기준일자",
        "processing": "명칭 정규화 + 2km 이내 중복 레코드 정리(최신 기준일 유지), 주요시설명에서 장애인화장실·무장애·유아숲 키워드 추출",
        "usedIn": "목록·지도의 기본 정보, 상세 기본 정보, ③숙박 가능 여부, ④장애인 화장실 단서, ⑤유아숲체험원, ⑥운영 연락처",
    },
    "nanum": {
        "name": "한국산림복지진흥원_무장애나눔길 조성정보",
        "org": "한국산림복지진흥원",
        "url": "https://www.data.go.kr/data/15063418/fileData.do",
        "refDate": "2025-12-31",
        "kind": "산림 · 파일데이터",
        "license": LICENSE,
        "fields": "조성연도, 관리기관, 사업명, 주소, 위도, 경도, 조성길이(m)",
        "processing": "휴양림과 공통 ID가 없어 좌표 직선거리(3km 이내)로 연결",
        "usedIn": "지도 나눔길 레이어·연결선, ⑤무장애나눔길 항목, 상세 '근처 무장애나눔길'",
    },
    "natfac": {
        "name": "산림청 국립자연휴양림관리소_국립자연휴양림 시설관련 정보",
        "org": "산림청 국립자연휴양림관리소",
        "url": "https://www.data.go.kr/data/15064419/fileData.do",
        "refDate": "2023-05-24",
        "kind": "산림 · 파일데이터",
        "license": LICENSE,
        "fields": "기관명, 상품구분, 상품명, 면적, 상품위치 위경도, 상품설명, 주소, 비수기·성수기 단가, 무료주차가능대수, 지역, 홈페이지주소",
        "processing": "휴양림명으로 표준데이터와 매칭(표준데이터에 없는 국립휴양림은 새로 추가), 객실 설명에서 장애인 우선예약·침대·온돌·다락/복층 키워드 추출",
        "usedIn": "상세 '객실 목록', ③장애인 우선예약 객실·침대방·객실 안 계단, ①주차",
    },
    "natpolicy": {
        "name": "산림청 국립자연휴양림관리소_국립자연휴양림 우선예약 및 추첨예약 정책",
        "org": "산림청 국립자연휴양림관리소",
        "url": "https://www.data.go.kr/data/15091720/fileData.do",
        "refDate": "2026-01-26",
        "kind": "산림 · 파일데이터",
        "license": LICENSE,
        "fields": "기관명, 정책구분, 정책명, 신청기간, 시설사용대상기간, 기관 위경도, 연락처, 홈페이지주소, 상품명, 객실인원수",
        "processing": "휴양림별·객실별로 장애인 추첨제, 다자녀 추첨제, 산림복지 바우처 우선예약 대상 여부 집계, 국립휴양림 대표 연락처·위치 보완",
        "usedIn": "상세 '예약 방법'과 객실별 추첨제 표시, ③장애인 추첨 객실, ⑥운영 연락처, 목록 필터 '장애인 추첨제 객실'",
    },
    "natintro": {
        "name": "산림청 국립자연휴양림관리소_국립자연휴양림 홍보",
        "org": "산림청 국립자연휴양림관리소",
        "url": "https://www.data.go.kr/data/15064415/fileData.do",
        "kind": "산림 · 파일데이터",
        "license": LICENSE,
        "fields": "기관명, 기관설명, 기관주소, 기관조성년도, 기관전화번호, 최대수용인원, 운영시간",
        "processing": "휴양림명으로 연결",
        "usedIn": "상세 기본 정보(소개·조성연도·운영시간·최대수용인원)",
    },
    "natlayout": {
        "name": "산림청 국립자연휴양림관리소_국립자연휴양림 배치도 및 상세배치도",
        "org": "산림청 국립자연휴양림관리소",
        "url": "https://www.data.go.kr/data/15091721/fileData.do",
        "kind": "산림 · 파일데이터",
        "license": LICENSE,
        "fields": "기관명, 시설구분, 상품명, 전체배치도(이미지 주소), 상세배치도(이미지 주소)",
        "processing": "휴양림 전체배치도와 객실별 상세배치도 이미지 주소를 휴양림명·객실명으로 연결",
        "usedIn": "상세 '배치도 보기', 객실 목록의 객실 위치도 링크, ①주차장→객실 동선 확인",
    },
    "natdiscount": {
        "name": "산림청 국립자연휴양림관리소_숲나들e 휴양림할인정책정보",
        "org": "산림청 국립자연휴양림관리소",
        "url": "https://www.data.go.kr/data/15113383/fileData.do",
        "kind": "산림 · 파일데이터",
        "license": LICENSE,
        "fields": "휴양림명, 할인대상, 등급별칭(중증·경증), 비수기·성수기 평일·주말 시설할인율, 유효여부",
        "processing": "유효한 할인만, 장애인·국가보훈대상자·다자녀·지역주민 대상별로 정리",
        "usedIn": "상세 '예약 방법 > 할인', ③장애인 할인 항목",
    },
    "natcompetition": {
        "name": "산림청 국립자연휴양림관리소_주말추첨경쟁률",
        "org": "산림청 국립자연휴양림관리소",
        "url": "https://www.data.go.kr/data/15127491/fileData.do",
        "kind": "산림 · 파일데이터",
        "license": LICENSE,
        "fields": "기관명, 정책명(연·월), 추첨대상상품, 추첨신청자수, 당첨자수, 경쟁률",
        "processing": "최근 12개월 신청자 합 ÷ 당첨자 합으로 평균 경쟁률, 가장 높은 달 표시",
        "usedIn": "상세 '예약 방법 > 예약 경쟁'",
    },
    "natoccupancy": {
        "name": "산림청 국립자연휴양림관리소_휴양림통합가동률현황",
        "org": "산림청 국립자연휴양림관리소",
        "url": "https://www.data.go.kr/data/15127656/fileData.do",
        "kind": "산림 · 파일데이터",
        "license": LICENSE,
        "fields": "기관명, 통계년도, 가동률, 주중·주말 가동률, 보유객실수",
        "processing": "가장 최근 통계년도 값 사용",
        "usedIn": "상세 '예약 방법 > 예약 경쟁'",
    },
    "natworks": {
        "name": "산림청 국립자연휴양림관리소_휴양림공사이력정보",
        "org": "산림청 국립자연휴양림관리소",
        "url": "https://www.data.go.kr/data/15113553/fileData.do",
        "kind": "산림 · 파일데이터",
        "license": LICENSE,
        "fields": "휴양림명, 객실 내외 구분, 사업년도, 사업내역, 상품명, 준공일자",
        "processing": "데이터의 마지막 사업연도 기준 최근 3년 공사만, 장애인·경사로·데크·계단·화장실·출입문 등 동선 관련 키워드 공사를 먼저 표시",
        "usedIn": "상세 '최근 시설 공사', 여정 체크 참고 단서",
    },
    "natclosure": {
        "name": "산림청 국립자연휴양림관리소_숲나들e 이용불가정보 및 위약금면제정보",
        "org": "산림청 국립자연휴양림관리소",
        "url": "https://www.data.go.kr/data/15113558/fileData.do",
        "kind": "산림 · 파일데이터",
        "license": LICENSE,
        "fields": "휴양림명, 이용불가 시작·종료일, 위약금면제여부, 일정제목",
        "processing": "휴양림별 최근 일정 5건",
        "usedIn": "상세 '예약 방법 > 이용불가 이력'",
    },
    "natsafety": {
        "name": "산림청 국립자연휴양림관리소_월별안전점검표",
        "org": "산림청 국립자연휴양림관리소 (운영기관 자체 점검)",
        "url": "https://www.data.go.kr/data/15128911/fileData.do",
        "kind": "산림 · 파일데이터",
        "license": LICENSE,
        "fields": "점검 항목, 기관명, 결과(예·아니오·해당없음), 점검일자",
        "processing": "48개 항목 중 AED·계단 미끄럼방지·대피 장소·어린이 놀이시설·물놀이·뱀·독충·숲길 이정표 7개 항목의 휴양림별 최신 결과",
        "usedIn": "상세 '운영기관 안전점검', ②계단, ⑥응급 대비, 유아 안전",
    },
    "kidsforest": {
        "name": "산림청_유아숲체험원 현황",
        "org": "산림청",
        "url": "https://www.data.go.kr/data/15081674/fileData.do",
        "kind": "산림 · 파일데이터",
        "license": LICENSE,
        "fields": "시설명, 주소, 운영기간, 전화번호, 참여방법",
        "processing": "좌표가 없어, 시설명에 휴양림명이 들어 있으면 '휴양림 안', 아니면 같은 시·군·구로 연결",
        "usedIn": "⑤유아숲체험원, 상세 '주변 시설'",
    },
    "healing": {
        "name": "산림청_치유의숲 현황",
        "org": "산림청",
        "url": "https://www.data.go.kr/data/15107928/fileData.do",
        "kind": "산림 · 파일데이터",
        "license": LICENSE,
        "fields": "지역, 시설명, 주소, 전화번호, 홈페이지, 참여방법, 관리주체",
        "processing": "시설명에 휴양림명이 들어 있으면 '휴양림 안', 아니면 같은 시·군·구로 연결",
        "usedIn": "상세 '주변 시설'",
    },
    "toilet": {
        "name": "전국공중화장실표준데이터",
        "org": "행정안전부 및 시·군·구 (공공데이터 개방표준)",
        "url": "https://www.data.go.kr/data/15012892/standard.do",
        "kind": "생활 · 표준데이터 (매시업)",
        "license": LICENSE,
        "fields": "화장실명, 소재지주소, 남·여 장애인용 대변기수, 남성 장애인용 소변기수, 남·여 어린이용 대변기수, 기저귀교환대장소, 개방시간, 위도, 경도, 데이터기준일자",
        "processing": "휴양림 좌표 1.5km 이내 공중화장실을 거리순으로 연결",
        "usedIn": "상세 '주변 공중화장실', ④장애인 화장실·어린이 화장실, 지도 화장실 레이어, 목록 필터 '근처 장애인 화장실'",
    },
    "jeju": {
        "name": "제주특별자치도_무장애여행정보 (붉은오름·서귀포자연휴양림)",
        "org": "제주특별자치도",
        "url": "https://www.data.go.kr/data/15075196/fileData.do",
        "refDate": "2020-12-22",
        "kind": "관광 · 파일데이터 (현장조사)",
        "license": LICENSE,
        "fields": "위도, 경도, 장소명칭, 장소상세정보, 무장애관광정보",
        "processing": "휴양림명으로 연결, '특이사항없음' 제외",
        "usedIn": "상세 '현장조사 기록', ②진입로 단차·경사, ④장애인 화장실, ⑤숲길 폭·경사·쉼터",
    },
}

SIDO_FULL = {
    "서울": "서울특별시", "부산": "부산광역시", "대구": "대구광역시", "인천": "인천광역시", "광주": "전남광주통합특별시",
    "대전": "대전광역시", "울산": "울산광역시", "세종": "세종특별자치시", "경기": "경기도", "강원": "강원특별자치도",
    "강원도": "강원특별자치도", "충북": "충청북도", "충남": "충청남도", "전북": "전북특별자치도", "전라북도": "전북특별자치도",
    "전남": "전남광주통합특별시", "전라남도": "전남광주통합특별시", "광주광역시": "전남광주통합특별시",
    "경북": "경상북도", "경남": "경상남도", "제주": "제주특별자치도", "제주도": "제주특별자치도",
}


def region_of(address, sido_hint=""):
    """주소에서 (시·도 정식명칭, 시·군·구) 추출. 우편번호·약칭 정리."""
    a = re.sub(r"^\(\d{5}\)\s*", "", (address or "").strip())
    toks = a.split()
    sido = ""
    if toks:
        t0 = toks[0]
        if t0 in SIDO_FULL or t0 in SIDO_FULL.values() or re.search(r"(도|특별시|광역시|특별자치시|특별자치도|통합특별시)$", t0):
            sido = SIDO_FULL.get(t0, t0)
            toks = toks[1:]
    if not sido:
        h = (sido_hint or "").split("/")[0].strip()
        sido = SIDO_FULL.get(h, h)
    sgg = next((t for t in toks[:2] if re.search(r"(시|군|구)$", t)), "")
    return sido, sgg


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
policy_rows = list(csv.DictReader(open(os.path.join(RAW, "extra", "15091720.csv"), encoding="utf-8-sig")))
toilet_raw = json.load(open(os.path.join(RAW, "extra", "toilet_std_slim.json"), encoding="utf-8"))
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
            "areaM2": fnum(r.get("RCRFRST_AR")),
            "admissionFee": (r.get("ADMFEE") or "").strip(),
            "facilities": split_facilities(r.get("MAIN_FCLTY_NM")),
            "institution": (r.get("INSTITUTION_NM") or "").strip(),
            "refDate": (r.get("REFERENCE_DATE") or "").strip(),
            "sources": ["std"],
        }
    )

# 중복 제거: 정규화 이름이 같고 2km 이내면 같은 휴양림 → 기준일이 최신인 레코드만 남김
def paren(s):
    m = re.search(r"\((.*?)\)", s or "")
    return norm_name(m.group(1)) if m else ""


def same_forest(a, b):
    na, nb = norm_name(a["name"]), norm_name(b["name"])
    # '산삼휴양밸리(대봉캠핑랜드)' ↔ '대봉캠핑랜드' 처럼 괄호 속 이름이 상대 이름인 경우도 같은 곳
    name_eq = na == nb or (paren(a["name"]) and paren(a["name"]) == nb) or (paren(b["name"]) and paren(b["name"]) == na)
    return name_eq and a["lat"] and b["lat"] and haversine(a["lat"], a["lng"], b["lat"], b["lng"]) < 2


groups = []
for f in forests:
    for g in groups:
        h = g[0]
        if same_forest(h, f):
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

# ---- 우선예약·추첨예약 정책: 휴양림별 연락처·위치, 객실별 추첨제 대상
LOTTERY_TYPES = {
    "장애인 추첨제": "disabled",
    "다자녀 추첨제": "multiChild",
    "산림복지 바우처 우선예약": "voucher",
}
room_key = lambda s: re.sub(r"\s", "", s or "")
policy = {}
for p in policy_rows:
    k = norm_name(p["기관명"])
    e = policy.setdefault(
        k,
        {
            "name": p["기관명"].strip(),
            "tel": p["연락처"].strip(),
            "lat": fnum(p["기관위도"]),
            "lng": fnum(p["기관경도"]),
            "homepage": p["홈페이지주소"].strip(),
            "region": p["지역"].strip(),
            "rooms": {},  # 상품명 → {capacity, priceOffWeekday, pricePeakWeekend, tags:set}
            "months": defaultdict(set),  # 유형 → 대상 월
            "used": False,
        },
    )
    kind = next((v for t, v in LOTTERY_TYPES.items() if t in p["정책명"]), None)
    r = e["rooms"].setdefault(
        room_key(p["상품명"]),
        {
            "name": p["상품명"].strip(),
            "capacity": fnum(p["객실인원수"]),
            "priceOffWeekday": fnum(p["비수기평일가격"]),
            "pricePeakWeekend": fnum(p["성수기주말가격"]),
            "tags": set(),
        },
    )
    if kind:
        r["tags"].add(kind)
        m = re.match(r"(\d{4})년 (\d{2})월", p["정책명"])
        if m:
            e["months"][kind].add(f"{m[1]}-{m[2]}")


def lottery_summary(pol):
    if not pol:
        return None
    out = {}
    for kind in LOTTERY_TYPES.values():
        rooms = sorted(r["name"] for r in pol["rooms"].values() if kind in r["tags"] and "폐쇄" not in r["name"])
        months = sorted(pol["months"].get(kind, []))
        out[kind] = {"rooms": rooms, "count": len(rooms), "months": [months[0], months[-1]] if months else []}
    return out


def clean_desc(s):
    s = re.sub(r"★[^★]*★", "", s or "")
    m = re.search(r"◈\s*시설현황\s*◈(.*?)(◈|※|$)", s, re.S)
    t = (m.group(1) if m else s).strip()
    t = re.sub(r"\s+", " ", t)
    return t[:140] + ("…" if len(t) > 140 else "")


nat_matched, nat_added = [], []
for fname, prods in nat_by_forest.items():
    rooms = [p for p in prods if p["상품구분"] == "숙박"]
    camps = [p for p in prods if p["상품구분"] == "야영"]
    pol = policy.get(norm_name(fname))
    if pol:
        pol["used"] = True
    coords = [(fnum(p["상품위치위도"]), fnum(p["상품위치경도"])) for p in prods]
    coords = [(a, b) for a, b in coords if a and b and 33 < a < 39 and 124 < b < 132]
    # 일부 레코드는 위경도 순서가 뒤바뀜 → 보정
    if not coords:
        coords = [(fnum(p["상품위치경도"]), fnum(p["상품위치위도"])) for p in prods]
        coords = [(a, b) for a, b in coords if a and b and 33 < a < 39 and 124 < b < 132]
    cla = sum(a for a, _ in coords) / len(coords) if coords else None
    clo = sum(b for _, b in coords) / len(coords) if coords else None
    # 예약정책 데이터의 기관 위치가 있으면 그쪽을 휴양림 대표 위치로 사용
    if pol and pol["lat"] and pol["lng"]:
        cla, clo = pol["lat"], pol["lng"]

    room_list = []
    for p in rooms:
        pr = (pol or {}).get("rooms", {}).get(room_key(p["상품명"]), {})
        d = p["상품설명"]
        room_list.append(
            {
                "name": p["상품명"].strip(),
                "areaM2": fnum(re.sub(r"[^0-9.]", "", p["면적"])),
                "capacity": pr.get("capacity"),
                "priceOffWeekday": fnum(p["비수기주중단가"]),
                "pricePeakWeekend": fnum(p["성수기주말단가"]),
                "desc": clean_desc(d),
                "disabledPriority": bool(re.search(ROOM_KW["disabledPriority"], d)),
                "bed": bool(re.search(ROOM_KW["bed"], d)),
                "ondol": bool(re.search(ROOM_KW["ondol"], d)),
                "loft": bool(re.search(ROOM_KW["loft"], d)),
                "lottery": sorted(pr.get("tags", [])),
            }
        )

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
        "roomList": room_list,
        "lottery": lottery_summary(pol),
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
        if pol:
            target["sources"].append("natpolicy")
            if not target["tel"] and pol["tel"]:
                target["tel"] = pol["tel"]
                target["telSource"] = "natpolicy"
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
                "tel": pol["tel"] if pol else "",
                "telSource": "natpolicy" if pol and pol["tel"] else None,
                "homepage": home[0][0] if home else "",
                "lat": cla,
                "lng": clo,
                "stay": True if rooms else None,
                "capacity": None,
                "areaM2": None,
                "admissionFee": "",
                "facilities": [],
                "institution": "산림청 국립자연휴양림관리소",
                "refDate": SOURCES["natfac"]["refDate"],
                "sources": ["natfac"] + (["natpolicy"] if pol else []),
                "national": natinfo,
                "notInStd": True,
            }
        )
        nat_added.append(fname)

# 예약정책에만 있는 국립휴양림: 표준데이터와 매칭되면 연락처·추첨 정보만 보완
policy_only = []
for k, pol in policy.items():
    if pol["used"]:
        continue
    for f in forests:
        if norm_name(f["name"]) == k and f["lat"] and pol["lat"] and haversine(f["lat"], f["lng"], pol["lat"], pol["lng"]) < 3:
            f["policyOnly"] = lottery_summary(pol)
            f["sources"].append("natpolicy")
            if not f["tel"]:
                f["tel"], f["telSource"] = pol["tel"], "natpolicy"
            pol["used"] = True
            break
    if not pol["used"]:
        policy_only.append(pol["name"])
report.append(f"- 예약정책 데이터에만 있고 연결하지 못한 휴양림: {', '.join(policy_only) or '없음'}\n")

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
    f"표준데이터에 없는 국립휴양림 {len(nat_added)}곳의 연락처를 찾으려면 별도 데이터셋(우선예약·추첨예약 정책)을 결합해야 함",
    "시설정보 데이터에 휴양림 대표 전화번호, 전체·장애인 주차면 수 필드 추가",
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

# ---------------------------------------------------------------- 6-2. 전국공중화장실표준데이터 결합
TH = {c["columNm"]: c["columCode"] for c in toilet_raw["header"]}
tg = lambda r, k: str(r.get(TH[k]) or "").strip()
tn = lambda r, k: int(fnum(tg(r, k)) or 0)
toilets = []
for r in toilet_raw["rows"]:
    la, lo = fnum(tg(r, "위도")), fnum(tg(r, "경도"))
    if not (la and lo and 33 < la < 39 and 124 < lo < 132):
        continue
    toilets.append(
        {
            "name": tg(r, "화장실명"),
            "address": tg(r, "소재지도로명주소") or tg(r, "소재지지번주소"),
            "lat": la,
            "lng": lo,
            "disabled": tn(r, "남성용-장애인용대변기수") + tn(r, "여성용-장애인용대변기수"),
            "disabledUrinal": tn(r, "남성용-장애인용소변기수"),
            "child": tn(r, "남성용-어린이용대변기수") + tn(r, "여성용-어린이용대변기수"),
            "diaper": tg(r, "기저귀교환대장소"),
            "openHours": tg(r, "개방시간"),
            "refDate": tg(r, "데이터기준일자"),
        }
    )
TOILET_KM = 1.5
toilet_hits = Counter()
toilet_layer = {}
for f in forests:
    near = []
    if f["lat"]:
        for t in toilets:
            if abs(t["lat"] - f["lat"]) > 0.02 or abs(t["lng"] - f["lng"]) > 0.025:
                continue
            d = haversine(f["lat"], f["lng"], t["lat"], t["lng"])
            if d <= TOILET_KM:
                near.append({**t, "distKm": round(d, 2)})
    near.sort(key=lambda t: (t["distKm"]))
    f["toilets"] = near[:6]
    if near:
        f["sources"].append("toilet")
        toilet_hits["any"] += 1
        if any(t["disabled"] for t in near):
            toilet_hits["disabled"] += 1
        if any(t["child"] for t in near):
            toilet_hits["child"] += 1
        for t in near[:6]:
            toilet_layer[(t["lat"], t["lng"], t["name"])] = {k: t[k] for k in ("name", "lat", "lng", "disabled", "child")}
diaper_filled = sum(bool(t["diaper"]) for t in toilets)
report.append("## 3-2. 전국공중화장실표준데이터 ↔ 휴양림 좌표 매칭\n")
report.append(f"- 좌표 있는 공중화장실 {len(toilets)}곳 / 전체 {len(toilet_raw['rows'])}곳")
report.append(f"- 휴양림 {TOILET_KM}km 이내 공중화장실이 있는 곳: {toilet_hits['any']}곳, 장애인용 대변기 있는 곳: {toilet_hits['disabled']}곳, 어린이용 대변기 있는 곳: {toilet_hits['child']}곳")
report.append(f"- 기저귀교환대장소 값이 있는 화장실: 전국 {diaper_filled}곳 / {len(toilet_raw['rows'])}곳\n")
log_issue(
    "전국공중화장실표준데이터",
    f"'기저귀교환대장소' 필드가 전국 {len(toilet_raw['rows']):,}건 중 {diaper_filled}건만 채워짐, 좌표 없는 화장실 {len(toilet_raw['rows']) - len(toilets):,}건",
    "유아 동반 가족이 휴양림 주변 기저귀 교환 시설을 공공데이터로 찾을 수 없음",
    "기저귀교환대 유무(Y/N) 필드 의무 입력, 휴양림 내 화장실은 휴양림 ID 연계",
)

# ---------------------------------------------------------------- 6-3. 지역 정규화·휴장 표시
for f in forests:
    f["sido"], f["sigungu"] = region_of(f["address"], f["sido"])
    f["closed"] = "휴장" in f["name"]

# ---------------------------------------------------------------- 6-4. 산림청 국립자연휴양림관리소 추가 데이터
# 공통 ID가 없어 휴양림명(정규화)으로 연결. 국립은 시설정보의 기관명, 그 외는 휴양림명 기준.
EXTRA_ROWS = {}


def read_csv(pk, enc="utf-8-sig"):
    rows = list(csv.DictReader(open(os.path.join(RAW, "extra", f"{pk}.csv"), encoding=enc, newline="")))
    EXTRA_ROWS[pk] = len(rows)
    return rows


by_norm = {}
for f in forests:
    by_norm.setdefault(norm_name(f["name"]), f)
    if f.get("national"):
        by_norm[norm_name(f["national"]["forestName"])] = f
for a, b in NAME_ALIAS.items():
    if b in by_norm:
        by_norm.setdefault(a, by_norm[b])
# 데이터셋마다 '속리산 자연휴양림'·'속리산 말티재자연휴양림'처럼 표기가 달라 보조 별칭
EXTRA_ALIAS = {"속리산": "속리산말티재"}


def find_forest(name):
    k = norm_name(name)
    return by_norm.get(k) or by_norm.get(EXTRA_ALIAS.get(k, ""))


def add_src(f, key):
    if key not in f["sources"]:
        f["sources"].append(key)


unmatched = defaultdict(set)

# (1) 국립자연휴양림 홍보: 소개 문구, 조성연도, 최대수용인원, 운영시간
for r in read_csv("15064415"):
    f = find_forest(r["기관명"])
    if not f:
        unmatched["natintro"].add(r["기관명"])
        continue
    f["intro"] = {
        "desc": r["기관설명"].strip(),
        "builtYear": r["기관조성년도"].strip(),
        "maxCapacity": fnum(r["최대수용인원"]),
        "hours": r["운영시간"].strip(),
    }
    if not f.get("capacity") and fnum(r["최대수용인원"]):
        f["capacity"] = fnum(r["최대수용인원"])
    add_src(f, "natintro")

# (2) 배치도: 휴양림 전체배치도, 객실별 상세배치도
layout_rows = read_csv("15091721")
room_layout = {}
for r in layout_rows:
    f = find_forest(r["기관명"])
    if not f:
        unmatched["natlayout"].add(r["기관명"])
        continue
    if r["전체배치도"].startswith("http"):
        f["layoutMap"] = r["전체배치도"].strip()
    if r["상세배치도"].startswith("http"):
        room_layout[(f["id"], room_key(r["상품명"]))] = r["상세배치도"].strip()
    add_src(f, "natlayout")
for f in forests:
    for room in (f.get("national") or {}).get("roomList", []):
        u = room_layout.get((f["id"], room_key(room["name"])))
        if u:
            room["layoutImg"] = u

# (3) 숲나들e 할인정책: 장애인(중증·경증), 국가보훈, 다자녀, 지역주민
DISCOUNT_ORDER = ["장애인", "국가보훈대상자", "다자녀", "지역주민"]
disc = defaultdict(dict)
for r in read_csv("15113383"):
    if r["유효여부"] != "Y" or r["할인대상"] not in DISCOUNT_ORDER:
        continue
    f = find_forest(r["휴양림명"])
    if not f:
        unmatched["natdiscount"].add(r["휴양림명"])
        continue
    label = r["할인대상"] + (f" ({r['등급별칭']})" if r["등급별칭"].strip() else "")
    rates = [fnum(r[k]) or 0 for k in ("비수기평일시설할인율", "비수기주말시설할인율", "성수기평일시설할인율", "성수기주말시설할인율")]
    prev = disc[f["id"]].get(label)
    if prev is None or rates[0] > prev["offWeekday"]:
        disc[f["id"]][label] = {
            "target": label,
            "group": r["할인대상"],
            "offWeekday": rates[0],
            "offWeekend": rates[1],
            "peakWeekday": rates[2],
            "peakWeekend": rates[3],
        }
for f in forests:
    if f["id"] in disc:
        f["discounts"] = sorted(disc[f["id"]].values(), key=lambda d: (DISCOUNT_ORDER.index(d["group"]), d["target"]))
        add_src(f, "natdiscount")

# (4) 주말 추첨 경쟁률(월별) + (5) 객실 가동률: 예약이 얼마나 어려운지 가늠할 근거
comp = defaultdict(list)
for r in read_csv("15127491"):
    f = find_forest(r["기관명"])
    m = re.match(r"(\d{4})년 (\d{2})월", r["정책명"])
    if not f or not m:
        if not f:
            unmatched["natcompetition"].add(r["기관명"])
        continue
    comp[f["id"]].append((f"{m[1]}-{m[2]}", fnum(r["경쟁률"]) or 0, fnum(r["추첨신청자수"]) or 0, fnum(r["당첨자수"]) or 0))
occ = {}
for r in read_csv("15127656"):
    f = find_forest(r["기관명"])
    if not f:
        unmatched["natoccupancy"].add(r["기관명"])
        continue
    y = r["통계년도"].strip()
    if f["id"] not in occ or y > occ[f["id"]]["year"]:
        occ[f["id"]] = {"year": y, "weekday": fnum(r["주중가동률"]), "weekend": fnum(r["주말가동률"]), "total": fnum(r["가동률"])}
for f in forests:
    c = sorted(comp.get(f["id"], []))
    o = occ.get(f["id"])
    if not c and not o:
        continue
    b = {}
    if c:
        last = c[-12:]
        apply_, win = sum(x[2] for x in last), sum(x[3] for x in last)
        peak = max(last, key=lambda x: x[1])
        b["lottery"] = {
            "from": last[0][0],
            "to": last[-1][0],
            "avgRate": round(apply_ / win, 1) if win else None,
            "peakMonth": peak[0],
            "peakRate": peak[1],
            "monthly": [{"m": x[0], "rate": x[1]} for x in last],
        }
        add_src(f, "natcompetition")
    if o:
        b["occupancy"] = o
        add_src(f, "natoccupancy")
    f["booking"] = b

# (6) 공사 이력: 최근 3개 사업연도, 접근성 관련 키워드 표시
WORK_A11Y = re.compile(r"장애인|무장애|경사로|승강기|엘리베이터|손잡이|핸드레일|난간|데크로드|데크길|산책로|계단|화장실|단차|문턱|출입문|진입로|보행")
works = defaultdict(list)
work_rows = read_csv("15113553")
work_last_year = max(r["사업년도"] for r in work_rows)
for r in work_rows:
    f = find_forest(r["휴양림명"])
    if not f:
        unmatched["natworks"].add(r["휴양림명"])
        continue
    works[f["id"]].append(r)
for f in forests:
    rs = works.get(f["id"])
    if not rs:
        continue
    recent = [r for r in rs if r["사업년도"] >= str(int(work_last_year) - 2)]
    items = []
    for r in sorted(recent, key=lambda r: r["준공일자"] or r["사업년도"], reverse=True):
        title = (r["사업내역"] or r["사업명"]).strip()
        items.append({
            "year": r["사업년도"],
            "title": title[:60],
            "scope": r["내외구분명"].strip(),
            "room": "" if r["상품명"] in ("해당없음", "") else r["상품명"].strip(),
            "done": r["준공일자"].strip() if re.match(r"\d{4}-", r["준공일자"]) else "",
            "a11y": bool(WORK_A11Y.search(title)),
        })
    items.sort(key=lambda x: not x["a11y"])  # 이미 준공일 최신순 → 동선 관련 공사를 앞으로
    f["works"] = {"total": len(rs), "recentCount": len(items), "items": items[:8], "lastYear": work_last_year}
    add_src(f, "natworks")

# (7) 이용불가·위약금 면제 일정(기상특보·공사 등)
closures = defaultdict(list)
for r in read_csv("15113558"):
    f = find_forest(r["휴양림명"])
    if not f:
        unmatched["natclosure"].add(r["휴양림명"])
        continue
    closures[f["id"]].append({"from": r["이용불가시작일"].strip(), "to": r["이용불가종료일"].strip(), "title": r["일정제목"].strip()[:50]})
for f in forests:
    c = closures.get(f["id"])
    if c:
        c.sort(key=lambda x: x["from"], reverse=True)
        f["closures"] = {"count": len(c), "items": c[:5]}
        add_src(f, "natclosure")

# (8) 월별 안전점검표(운영기관 자체 점검): 보행약자 여정과 관련된 항목만
SAFETY_ITEMS = {
    "aed": ("자동제세동기", "자동심장충격기(AED) 관리자 지정·월별 점검"),
    "stairsNonSlip": ("계단은 미끄럼방지", "계단 미끄럼방지 처리"),
    "evacuation": ("대피할 수 있는 장소", "재해 시 이용객 대피 장소"),
    "playground": ("어린이놀이시설", "어린이 놀이시설 월 1회 안전검사"),
    "water": ("물놀이 안전사고", "계곡 물놀이 안전 조치"),
    "snake": ("뱀, 독충", "뱀·독충 물림 예방 조치"),
    "signage": ("안내이정표", "숲길 안내이정표·국가지점번호 관리"),
}
safety = defaultdict(dict)
safety_orgs = set()
EXTRA_ROWS["15128911"] = 0
with open(os.path.join(RAW, "extra", "15128911.csv"), encoding="utf-8-sig", newline="") as fh:
    for r in csv.DictReader(fh):
        EXTRA_ROWS["15128911"] += 1
        key = next((k for k, (needle, _) in SAFETY_ITEMS.items() if needle in r["항목제목"]), None)
        if not key:
            continue
        f = find_forest(r["기관명"])
        if not f:
            unmatched["natsafety"].add(r["기관명"])
            continue
        safety_orgs.add(f["id"])
        prev = safety[f["id"]].get(key)
        if prev is None or r["점검일자"] > prev["date"]:
            safety[f["id"]][key] = {"key": key, "label": SAFETY_ITEMS[key][1], "result": r["결과구분명"].strip(), "date": r["점검일자"].strip()}
for f in forests:
    s = safety.get(f["id"])
    if s:
        f["safety"] = {"items": [s[k] for k in SAFETY_ITEMS if k in s], "lastDate": max(v["date"] for v in s.values())}
        add_src(f, "natsafety")

# (9) 유아숲체험원 현황, (10) 치유의숲 현황: 이름에 휴양림명이 들어가면 '안', 아니면 같은 시·군·구
def place_index(rows, name_key, addr_key):
    out = []
    for r in rows:
        sd, sg = region_of(r[addr_key].strip())
        out.append({"name": r[name_key].strip(), "address": r[addr_key].strip(), "tel": (r.get("전화번호") or "").strip(), "sido": sd, "sigungu": sg})
    return out


def link_places(key, places, src):
    hits = 0
    for f in forests:
        nn = norm_name(f["name"])
        inside = [p for p in places if nn and len(nn) >= 2 and nn in norm_name(p["name"])]
        same = [p for p in places if p not in inside and f["sigungu"] and p["sigungu"] == f["sigungu"] and p["sido"] == f["sido"]]
        if inside or same:
            f[key] = {"inside": inside[:3], "sameArea": same[:4], "sameAreaCount": len(same)}
            add_src(f, src)
            hits += 1
    return hits


kids_places = place_index(read_csv("15081674", "cp949"), "시설명", "주소")
heal_places = place_index(read_csv("15107928", "cp949"), "시설명", "주소")
kids_hits = link_places("kidsPlaces", kids_places, "kidsforest")
heal_hits = link_places("healingPlaces", heal_places, "healing")

report.append("## 3-3. 산림청 국립자연휴양림관리소 추가 데이터 결합 (휴양림명 매칭)\n")
for key in ["natintro", "natlayout", "natdiscount", "natcompetition", "natoccupancy", "natworks", "natclosure", "natsafety", "kidsforest", "healing"]:
    n = sum(key in f["sources"] for f in forests)
    report.append(f"- {key}: {n}곳 연결" + (f" / 연결 못한 이름: {', '.join(sorted(unmatched[key]))}" if unmatched.get(key) else ""))
report.append("")
log_issue(
    "국립자연휴양림관리소 데이터 전반",
    "데이터셋마다 휴양림 표기('속리산 자연휴양림'·'속리산 말티재자연휴양림')와 기관아이디 형식('101'·'0101'·'ID02030103')이 달라 결합 시 별칭표가 필요",
    "같은 휴양림의 할인·배치도·안전점검 정보를 자동으로 모으기 어렵고, 누락이 생겨도 알아차리기 어려움",
    "국립자연휴양림관리소 데이터 전체에 같은 형식의 휴양림 ID 사용, 전국휴양림표준데이터에도 같은 ID 부여",
)
log_issue(
    "국립자연휴양림 월별 안전점검표",
    "점검 항목에 계단 미끄럼방지·AED는 있으나 경사로·장애인 객실·장애인 화장실 상태 점검 항목은 없음",
    "보행약자가 가장 궁금한 시설의 최근 상태를 공공데이터로 확인할 수 없음",
    "안전점검표에 무장애 시설(경사로·장애인 객실 출입문·장애인 화장실) 점검 항목 추가",
)
log_issue(
    "유아숲체험원 현황 / 치유의숲 현황",
    "주소만 있고 위경도·휴양림 ID가 없음",
    "휴양림 안에 있는 시설인지 이름 일부와 시·군·구로만 추정 가능",
    "위경도와 소재 휴양림(산림휴양시설) ID 필드 추가",
)

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
    {
        "sources": SOURCES,
        "forests": forests,
        "nanumAll": [{k: n[k] for k in ("name", "lat", "lng", "lengthM", "year", "org")} for n in nanum if n["lat"]],
        "toiletLayer": list(toilet_layer.values()),
    },
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
    "toiletTotal": len(toilet_raw["rows"]),
    "toiletDiaperFilled": diaper_filled,
    "toiletHits": dict(toilet_hits),
    "lotteryForests": sum(1 for f in forests if (f.get("national") or {}).get("lottery") or f.get("policyOnly")),
    "telFromPolicy": sum(1 for f in forests if f.get("telSource") == "natpolicy"),
    "rowCounts": {
        "std": len(STD_ROWS),
        "nanum": len(nanum_rows),
        "natfac": len(nat_rows),
        "natpolicy": len(policy_rows),
        "toilet": len(toilet_raw["rows"]),
        "jeju": 0,
        **{k: EXTRA_ROWS.get(re.search(r"/data/(\d+)/", v["url"])[1], 0) for k, v in SOURCES.items()
           if k.startswith("nat") and k not in ("natfac", "natpolicy") or k in ("kidsforest", "healing")},
    },
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
