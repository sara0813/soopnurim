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
        "processing": "명칭 정규화 + 2km 이내 또는 같은 도로명주소의 중복 레코드 정리(최신 기준일 유지), 주요시설명에서 장애인화장실·무장애·유아숲 키워드 추출",
        "usedIn": "목록·지도의 기본 정보, 상세 기본 정보, ④숙박 가능 여부, ⑤장애인 화장실 단서, ⑥유아숲체험원, ⑦운영 연락처",
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
        "usedIn": "지도 나눔길 레이어·연결선, ⑥무장애나눔길 항목, 상세 '근처 무장애나눔길'",
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
        "usedIn": "상세 '객실 목록', ④장애인 우선예약 객실·침대방·객실 안 계단·입퇴실 시간, ②주차, ①입실 본인확인, ⑦바비큐·산불 예방",
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
        "usedIn": "상세 '예약 방법'과 객실별 추첨제 표시, ④장애인 추첨 객실, ①아세안 우선예약, ⑦운영 연락처, 목록 필터 '장애인 추첨제 객실'",
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
        "usedIn": "상세 '배치도 보기', 객실 목록의 객실 위치도 링크, ②주차장→객실 동선 확인",
    },
    "natdiscount": {
        "name": "산림청 국립자연휴양림관리소_숲나들e 휴양림할인정책정보",
        "org": "산림청 국립자연휴양림관리소",
        "url": "https://www.data.go.kr/data/15113383/fileData.do",
        "kind": "산림 · 파일데이터",
        "license": LICENSE,
        "fields": "휴양림명, 할인대상, 등급별칭(중증·경증), 비수기·성수기 평일·주말 시설할인율, 유효여부",
        "processing": "유효한 할인만, 장애인·국가보훈대상자·다자녀·지역주민 대상별로 정리",
        "usedIn": "상세 '예약 방법 > 할인', ④장애인 할인 항목",
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
        "usedIn": "상세 '운영기관 안전점검', ③계단, ⑦응급 대비, 유아 안전",
    },
    "kidsforest": {
        "name": "산림청_유아숲체험원 현황",
        "org": "산림청",
        "url": "https://www.data.go.kr/data/15081674/fileData.do",
        "kind": "산림 · 파일데이터",
        "license": LICENSE,
        "fields": "시설명, 주소, 운영기간, 전화번호, 참여방법",
        "processing": "좌표가 없어, 시설명에 휴양림명이 들어 있으면 '휴양림 안', 아니면 같은 시·군·구로 연결",
        "usedIn": "⑥유아숲체험원, 상세 '주변 시설'",
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
        "usedIn": "상세 '주변 공중화장실', ⑤장애인 화장실·어린이 화장실, 지도 화장실 레이어, 목록 필터 '근처 장애인 화장실'",
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
        "usedIn": "상세 '현장조사 기록', ③진입로 단차·경사, ⑤장애인 화장실, ⑥숲길 폭·경사·쉼터",
    },
    "busstop": {
        "name": "국토교통부_전국 버스정류장 위치정보",
        "org": "국토교통부 (TAGO 연계 지자체)",
        "url": "https://www.data.go.kr/data/15067528/fileData.do",
        "kind": "교통 · 파일데이터 (매시업)",
        "license": LICENSE,
        "fields": "정류장번호, 정류장명, 위도, 경도, 정보수집일, 도시명",
        "processing": "휴양림 좌표에서 직선거리 3km 이내 정류장을 가까운 순으로 연결. TAGO에 연계되지 않은 일부 시·군은 데이터에 없음",
        "usedIn": "②대중교통(가장 가까운 정류장), 외국인 이용자 여정",
    },
    "rail": {
        "name": "한국철도공사_역 위치 정보",
        "org": "한국철도공사",
        "url": "https://www.data.go.kr/data/15127532/fileData.do",
        "refDate": "2024-04-01",
        "kind": "교통 · 파일데이터 (매시업)",
        "license": LICENSE,
        "fields": "지역본부, 역명, 위도, 경도, 출입구 개수",
        "processing": "휴양림 좌표에서 직선거리로 가장 가까운 한국철도공사 역 1곳 (30km 이내). 열차 운행 여부·횟수는 데이터에 없음",
        "usedIn": "②가까운 철도역, 외국인 이용 안내 '대중교통'",
    },
    "touristinfo": {
        "name": "한국관광공사_전국관광안내소 정보",
        "org": "한국관광공사 (관광정보시스템 KOTIS 개방데이터)",
        "url": "https://www.data.go.kr/data/15151450/fileData.do",
        "refDate": "2026-09-29",
        "kind": "관광 · 파일데이터 (매시업)",
        "license": LICENSE,
        "fields": "안내소명, 주소, 제공 언어, 전화번호, 운영시간, 휴무일",
        "processing": "주소에 좌표·시·도가 없어 거리를 잴 수 없음. 휴양림과 같은 읍·면 이름이 주소에 있고 전화 지역번호가 같은 안내소만 연결 (폐쇄·고속도로 휴게소·운영 안 함 제외). 다른 읍·면이면 빈칸",
        "usedIn": "②관광안내소(외국어), 외국인 이용 안내 '대중교통'",
    },
    # 공공데이터포털 데이터셋이 아니라 기관 누리집의 공식 목록. '공공데이터 N종' 집계에서는 뺀다(notPortal)
    "kfslist": {
        "name": "산림청 자연휴양림 찾기 목록 (국립·지자체·개인)",
        "org": "산림청",
        "url": "https://www.forest.go.kr/kfsweb/kfi/kfs/foreston/main/contents/CmpngInfo/selectCmpngInfoList.do?restTpcd=01&restMngmeMnbdCd=002&mn=AR02_01_01_04",
        "kind": "산림 · 기관 누리집 공식 목록",
        "license": "산림청 누리집 공개 정보",
        "fields": "휴양림명, 운영 구분(국립·지자체·개인), 주소, 전화번호, 누리집",
        "processing": "전국휴양림표준데이터·국립자연휴양림 시설정보와 이름·도로명주소로 대조해, 어디에도 없는 휴양림만 목록에 추가. 좌표는 숲나들e '찾아오시는 길' 지도 값을 쓰고, 없으면 OpenStreetMap(Nominatim)에서 이름·주소로 찾은 값이라 오차가 있을 수 있음 (좌표 없는 곳은 지도에서 빠짐)",
        "usedIn": "휴양림 목록·지도(표준데이터에서 빠진 휴양림 보완), 연락처",
        "notPortal": True,
    },
    "ftlist": {
        "name": "숲나들e 휴양림 목록",
        "org": "산림청 국립자연휴양림관리소 (숲나들e)",
        "url": "https://www.foresttrip.go.kr/main.do?hmpgId=FRIP",
        "kind": "산림 · 기관 누리집 공식 목록",
        "license": "숲나들e 누리집 공개 정보",
        "fields": "휴양림명, 휴양림 누리집 주소·전화",
        "processing": "산림청 목록에도 없는 휴양림 중 숲나들e에서 예약을 받는 곳(이름에 '자연휴양림'이 있는 곳)만 추가. 좌표는 숲나들e 지도 값, 없으면 OpenStreetMap(Nominatim) 검색",
        "usedIn": "휴양림 목록·지도(신규 개장 휴양림 보완), 연락처",
        "notPortal": True,
    },
}

# 영어 화면용 출처 설명 (이름은 원문 병기)
SOURCES_EN = {
    "std": ("National Recreation Forest Standard Data", "Korea Forest Service and local governments (public data standard)", "Forest standard data",
            "Name, type, address, coordinates, phone, website, overnight stay, capacity, main facilities, reference date",
            "Duplicates (same name within 2 km, or same road address) merged, keeping the newest record", "Forest list, map, basic info"),
    "nanum": ("Barrier-free Trail (Nanumgil) Status", "Korea Forest Service", "Forest file data",
              "Trail name, year built, operator, address, length",
              "Addresses geocoded; trails within 3 km of a forest are linked", "Step 6 barrier-free trail, map trail layer"),
    "natfac": ("National Recreation Forest Facility Information", "National Forest Recreation Service", "Forest file data",
               "Forest, product type, room name, area, coordinates, description, prices, parking",
               "Keywords (bed, ondol, loft, priority room) and check-in/out times extracted from room descriptions",
               "Room list, step 4 rooms and check-in/out times, step 2 parking, step 1 ID at check-in, step 7 barbecue rules"),
    "natpolicy": ("National Recreation Forest Priority and Lottery Booking Policy", "National Forest Recreation Service", "Forest file data",
                  "Forest, policy name, application period, stay period, room, phone, coordinates",
                  "Lottery rooms and months per forest; ASEAN priority rooms and windows for ASEAN Natural Recreation Forest",
                  "Lottery booking, step 1 ASEAN priority booking, step 7 phone numbers"),
    "natintro": ("National Recreation Forest Introduction", "National Forest Recreation Service", "Forest file data",
                 "Description, year built, maximum capacity, operating hours", "Linked by forest name", "Forest introduction"),
    "natlayout": ("National Recreation Forest Layout Maps", "National Forest Recreation Service", "Forest file data",
                  "Site map and room layout images", "Linked by forest and room name", "Site map, room layouts"),
    "natdiscount": ("National Recreation Forest Discounts", "National Forest Recreation Service", "Forest file data",
                    "Discount target and rate by season", "Grouped by target", "Discounts"),
    "natcompetition": ("National Recreation Forest Lottery Competition Rates", "National Forest Recreation Service", "Forest file data",
                       "Monthly lottery competition rate", "Average and peak month per forest", "Booking competition"),
    "natoccupancy": ("National Recreation Forest Occupancy Rates", "National Forest Recreation Service", "Forest file data",
                     "Weekday, weekend and total occupancy", "Latest year per forest", "Occupancy"),
    "natworks": ("National Recreation Forest Maintenance Works", "National Forest Recreation Service", "Forest file data",
                 "Year, work title, scope, room, completion date", "Accessibility-related works flagged", "Maintenance history"),
    "natclosure": ("National Recreation Forest Closure Records", "National Forest Recreation Service", "Forest file data",
                   "Closure period and reason", "Past closures per forest", "Past closures"),
    "natsafety": ("National Recreation Forest Safety Inspections", "National Forest Recreation Service", "Forest file data",
                  "Inspection item, result, date", "Latest result per item", "Step 7 safety"),
    "kidsforest": ("Children's Forest Experience Centers", "Korea Forest Service", "Forest file data",
                   "Name, address, phone, operator", "Linked inside the forest or in the same city/county", "Nearby places"),
    "healing": ("Healing Forest Status", "Korea Forest Service", "Forest file data",
                "Region, name, address, phone, website", "Linked inside the forest or in the same city/county", "Nearby places"),
    "toilet": ("National Public Toilet Standard Data", "Ministry of the Interior and Safety and local governments", "Living standard data (mashup)",
               "Name, address, accessible and children's toilets, diaper station, hours, coordinates",
               "Public toilets within 1.5 km of a forest, nearest first", "Step 5 toilets, map toilet layer"),
    "jeju": ("Jeju Barrier-free Travel Information", "Jeju Special Self-Governing Province", "Tourism file data (field survey)",
             "Coordinates, place, details, barrier-free notes", "Linked by forest name", "Field survey notes"),
    "busstop": ("Nationwide Bus Stop Locations", "Ministry of Land, Infrastructure and Transport (TAGO cities)", "Transport file data (mashup)",
                "Stop ID, stop name, coordinates, collection date, city",
                "Stops within 3 km (straight line) of a forest, nearest first. Some cities not linked to TAGO are missing",
                "Step 2 public transport, foreign visitor journey"),
    "rail": ("KORAIL Station Locations", "Korea Railroad Corporation (KORAIL)", "Transport file data (mashup)",
             "Regional HQ, station name, coordinates, number of exits",
             "Nearest KORAIL station to the forest in a straight line (within 30 km). Whether and how often trains stop is not in the data",
             "Step 2 nearest train station, foreign visitor guide"),
    "touristinfo": ("Nationwide Tourist Information Centers", "Korea Tourism Organization (KOTIS open data)", "Tourism file data (mashup)",
                    "Center name, address, languages, phone, hours, closing days",
                    "Addresses have no coordinates or province, so distance cannot be measured. Linked only when the address has the same town (eup/myeon) as the forest and the same phone area code (closed, highway rest-area and inactive centers excluded); otherwise blank",
                    "Step 2 tourist information center, foreign visitor guide"),
    "kfslist": ("Korea Forest Service list of recreation forests (national, local, private)", "Korea Forest Service",
                "Forest sector · official list on an agency website",
                "Forest name, operator type, address, phone, website",
                "Compared with the standard data and national facility data by name and road address; only forests missing from both are added. Coordinates come from the Foresttrip directions map, or else an OpenStreetMap (Nominatim) search, and may be off (forests without coordinates are left off the map)",
                "Forest list and map (filling gaps in the standard data), contact"),
    "ftlist": ("Foresttrip forest list", "National Forest Recreation Service (Foresttrip)",
               "Forest sector · official list on an agency website",
               "Forest name, address and phone from each forest's Foresttrip page",
               "Adds forests that take bookings on Foresttrip but are in neither the KFS list nor the standard data. Coordinates from the Foresttrip map, or else OpenStreetMap (Nominatim)",
               "Forest list and map (newly opened forests), contact"),
}
for _k, (_n, _o, _kd, _fd, _pr, _u) in SOURCES_EN.items():
    SOURCES[_k].update({"name_en": _n, "org_en": _o, "kind_en": _kd, "fields_en": _fd, "processing_en": _pr, "usedIn_en": _u})

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


def road_key(addr):
    """도로명+건물번호 (예: 대둔산로6). 이름이 달라도 같은 곳을 찾기 위함"""
    m = re.search(r"(\S+(?:로|길))\s*(\d+(?:-\d+)?)", addr or "")
    return m.group(1) + m.group(2) if m else ""


def road_name(addr):
    """도로명만 (예: 1100로, 대둔산로). 건물번호는 뺀다"""
    # '자은서부 2길 508'처럼 도로명이 띄어 쓴 번호로 끝나는 경우도 한 도로명으로 본다
    m = re.search(r"([가-힣A-Za-z\d]+(?:\s\d+(?:번)?(?:로|길))|[가-힣A-Za-z\d]+(?:로|길))\s*\d", addr or "")
    return m.group(1).replace(" ", "") if m else ""


def roads_differ(a, b):
    """둘 다 도로명이 있고 서로 다른 길일 때만 True.
    '제주 1100로' ↔ '1100로'처럼 앞에 지역명이 붙은 경우와 한 글자 오타('구인원길' ↔ '구인월길')는 같은 길로 본다"""
    if not (a and b) or a.endswith(b) or b.endswith(a):
        return False
    return not (len(a) == len(b) and sum(x != y for x, y in zip(a, b)) <= 1)


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


def log_issue(dataset, problem, impact, proposal, en=None):
    """en = (dataset, problem, impact, proposal) 영어 화면용"""
    it = {"dataset": dataset, "problem": problem, "impact": impact, "proposal": proposal}
    if en:
        it.update(dict(zip(("dataset_en", "problem_en", "impact_en", "proposal_en"), en)))
    improve_log.append(it)


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
    en=("National Recreation Forest Standard Data",
        "None of the 17 standard fields covers accessibility (thresholds, slopes, accessible rooms, toilets)",
        "People with limited mobility have no evidence to judge each step of a trip",
        "Add detailed barrier-free fields (proposal 1)"),
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

# 중복 제거: 정규화 이름이 같고 2km 이내이거나, 도로명주소(도로명+건물번호)가 같고 0.5km 이내면 같은 휴양림
# (예: '갈모봉자연휴양림(고성)' ↔ '고성갈모봉 자연휴양림'처럼 이름 표기만 다른 중복 등록) → 기준일이 최신인 레코드만 남김
def paren(s):
    m = re.search(r"\((.*?)\)", s or "")
    return norm_name(m.group(1)) if m else ""


def same_forest(a, b):
    na, nb = norm_name(a["name"]), norm_name(b["name"])
    # '산삼휴양밸리(대봉캠핑랜드)' ↔ '대봉캠핑랜드' 처럼 괄호 속 이름이 상대 이름인 경우도 같은 곳
    name_eq = na == nb or (paren(a["name"]) and paren(a["name"]) == nb) or (paren(b["name"]) and paren(b["name"]) == na)
    if not (a["lat"] and b["lat"]):
        return False
    d = haversine(a["lat"], a["lng"], b["lat"], b["lng"])
    rk = road_key(a["address"])
    return (name_eq and d < 2) or (rk and rk == road_key(b["address"]) and d < 0.5)


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
    # 기준일이 같으면 '자연휴양림'이 이름에 있는 기록을 남긴다 (예: 방화동자연휴양림 ↔ 방화동가족휴가촌)
    g.sort(key=lambda f: (f["refDate"], "자연휴양림" in f["name"], len(f["tel"]) > 0, len(f["facilities"])), reverse=True)
    keep = g[0]
    if len(g) > 1:
        keep["duplicates"] = [{"name": d["name"], "institution": d["institution"], "refDate": d["refDate"]} for d in g[1:]]
        # 최신 레코드에 비어 있는 값은 중복 레코드에서 보완
        for d in g[1:]:
            for k in ["tel", "homepage", "address"]:
                if not keep[k] and d[k]:
                    keep[k] = d[k]
    forests.append(keep)
report.append("### 중복 레코드 (정규화 이름 동일 + 2km 이내, 또는 도로명주소 동일 + 0.5km 이내)" + chr(10))
for g in dups:
    report.append("- " + " / ".join(f"{d['name']}({d['institution']}, {d['refDate']})" for d in g))
report.append(chr(10) + f"→ {sum(len(g) - 1 for g in dups)}건 제거, 기준일 최신 레코드 유지 (표준데이터 {len(STD_ROWS)}건 → {len(forests)}곳)" + chr(10))
log_issue(
    "전국휴양림표준데이터",
    f"같은 휴양림이 시·군과 시·도 등 여러 제공기관에서 중복 등록됨 ({len(dups)}곳, {sum(len(g) - 1 for g in dups)}건)",
    "목록·지도에 같은 숲이 두 번 나타나고, 기준일이 다른 정보가 서로 충돌",
    "휴양림 고유 ID(지정번호) 필드 추가, 제공기관 간 중복 등록 정리",
    en=("National Recreation Forest Standard Data",
        f"The same forest is registered by several providers, e.g. both city and province ({len(dups)} forests, {sum(len(g) - 1 for g in dups)} records)",
        "The same forest appears twice in lists and maps, with conflicting dates",
        "Add a unique forest ID and clean up duplicates between providers"),
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

# ---------------------------------------------------------------- 1-5. 공식 목록과 대조: 표준데이터에서 빠진 휴양림 보완
# 전국휴양림표준데이터는 지자체가 각자 등록하므로 등록하지 않은 휴양림(예: 서울 노원구 수락휴)이 빠진다.
# 산림청 '자연휴양림 찾기' 전체 목록·숲나들e 목록과 대조해 어디에도 없는 곳만 추가한다 (scripts/fetch_forest_list.py)
OFFICIAL = os.path.join(RAW, "extra", "forest_list_official.json")
FOREST_GEO = os.path.join(RAW, "extra", "forest_geocode.json")
FOREST_UNMATCHED = os.path.join(RAW, "extra", "forest_list_unmatched.json")
official = json.load(open(OFFICIAL, encoding="utf-8"))
geo = json.load(open(FOREST_GEO, encoding="utf-8")) if os.path.exists(FOREST_GEO) else {}
for _k in ("kfslist", "ftlist"):
    SOURCES[_k]["refDate"] = official["refDate"]


def name_keys(n):
    """정규화한 이름과 괄호 안 별칭"""
    keys = {norm_name(n)} | {norm_name(x) for x in re.findall(r"\((.*?)\)", n or "")}
    return {k.replace("산림휴양관", "") for k in keys if len(k) >= 2}


def match_official(name, addr):
    sido, sgg = region_of(addr)
    keys = name_keys(name)
    same = [f for f in forests if name_keys(f["name"]) & keys]
    if same:
        loc = [f for f in same if sgg and sgg in (f.get("address") or "")]
        return (loc or same)[0], "이름"
    rk = road_key(addr)
    if rk:
        hit = next((f for f in forests if road_key(f.get("address")) == rk), None)
        if hit:
            return hit, "주소"
    # 이름 일부가 겹치고 같은 시·군·구일 때만 같은 곳으로 본다 (예: 금산 ↔ 금산산림문화타운 오인 방지)
    # 둘 다 도로명이 있는데 서로 다르면 다른 곳 (예: 국립 금산자연휴양림 거북바위길 ↔ 금산산림문화타운 느티골길)
    road = road_name(addr)
    for f in forests:
        fk = name_keys(f["name"])
        froad = road_name(f.get("address"))
        if roads_differ(road, froad):
            continue
        if sgg and sgg in (f.get("address") or "") and any(a in b or b in a for a in fk for b in keys):
            return f, "이름 일부+시군구"
    return None, ""


list_added, list_matched, unmatched_geo, list_loose = [], Counter(), [], []
# 산림청 목록의 표기 오류·띄어쓰기만 화면용으로 다듬는다 (좌표 캐시·대조는 원래 이름 기준)
LIST_NAME_FIX = {
    "소노벨비발디파(두릉산자연휴양림)": "두릉산자연휴양림(소노벨 비발디파크)",
    "집다리골자연휴양림(강원숲체험장포함)": "집다리골자연휴양림(강원숲체험장 포함)",
}
# 한 번 쓴 id는 다른 휴양림에 다시 주지 않는다 (공유된 주소·제보가 엉뚱한 곳을 가리키지 않게).
# k002 남원흥부골자연휴양림은 표준데이터 '흥부골자연휴양림'(s131, 도로명 오타 '구인원길')과 같은 곳으로 확인돼 빠짐
RETIRED_IDS = {"k002"}
_next_k = 0


def next_list_id():
    global _next_k
    while f"k{_next_k:03d}" in RETIRED_IDS:
        _next_k += 1
    _next_k += 1
    return f"k{_next_k - 1:03d}"


for src, entries in (("kfslist", official["kfs"]), ("ftlist", official["foresttrip"])):
    for e in entries:
        if src == "ftlist" and ("자연휴양림" not in e["name"] or not e.get("address")):
            continue  # 숲나들e에만 있는 곳은 '자연휴양림'이고 주소가 확인된 곳만
        hit, how = match_official(e["name"], e["address"])
        if hit:
            list_matched[how] += 1
            if how != "이름":
                list_loose.append(f"{e['name']} → {hit['name']} ({how})")
            if src == "kfslist" and not hit.get("tel") and e.get("tel") and re.search(r"\d", e["tel"]):
                hit["tel"], hit["telSource"] = e["tel"], "kfslist"
                hit["sources"].append("kfslist")
            continue
        g = geo.get(e["name"])
        not_open = e.get("tel") == "미운영"
        forests.append({
            "id": next_list_id(),
            "name": LIST_NAME_FIX.get(e["name"], e["name"]),
            "sido": "",
            "ownership": e.get("ownership") or "공유림",
            # 산림청 목록 주소에 시·군이 빠진 곳 보정
            "address": e["address"].replace("대구광역시 가창면", "대구광역시 달성군 가창면"),
            "tel": e["tel"] if re.search(r"\d", e.get("tel") or "") else "",
            "telSource": src,
            "homepage": e.get("homepage") or (f"https://www.foresttrip.go.kr/indvz/main.do?hmpgId={e['insttId']}" if e.get("insttId") else ""),
            "lat": g["lat"] if g else None,
            "lng": g["lng"] if g else None,
            "geoSource": g.get("source", "osm") if g else None,
            "stay": None,
            "capacity": None,
            "areaM2": None,
            "admissionFee": "",
            "facilities": [],
            "institution": "",
            "refDate": official["refDate"],
            "sources": [src],
            "listOnly": True,
            "notOpen": not_open,
        })
        list_added.append(e["name"])
        if not g:
            unmatched_geo.append({"name": e["name"], "address": e["address"], "homepage": forests[-1]["homepage"]})
json.dump(unmatched_geo, open(FOREST_UNMATCHED, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
report.append("## 1-5. 공식 목록과 대조\n")
report.append(f"- 산림청 자연휴양림 목록 {len(official['kfs'])}곳, 숲나들e 목록 {len(official['foresttrip'])}곳 ({official['refDate']} 수집)")
report.append(f"- 기존 데이터와 연결: " + ", ".join(f"{k} {v}곳" for k, v in list_matched.items()))
report.append(f"- **표준데이터·국립 시설정보 어디에도 없어 추가: {len(list_added)}곳** – " + ", ".join(list_added))
report.append("- 이름이 달라 주소·시군구로 연결한 곳: " + "; ".join(list_loose))
report.append(f"- 좌표를 찾지 못한 곳: {', '.join(x['name'] for x in unmatched_geo) or '없음'}\n")
print("official list added:", len(list_added), list_added, "no coords:", len(unmatched_geo))
log_issue(
    "전국휴양림표준데이터 ↔ 산림청 자연휴양림 목록",
    f"산림청 누리집의 자연휴양림 {len(official['kfs'])}곳과 대조하니, 표준데이터와 국립 시설정보 어디에도 없는 휴양림이 {len(list_added)}곳 (서울 노원구 수락휴 등)",
    "표준데이터만 쓰는 서비스에서는 서울처럼 휴양림이 있는 지역이 '0곳'으로 보이고, 새로 연 휴양림을 찾을 수 없음",
    "산림청 지정 자연휴양림 전체를 표준데이터에 등록하도록 제공 의무화, 지정·개장·폐장 날짜 필드 추가",
    en=("National Recreation Forest Standard Data ↔ Korea Forest Service forest list",
        f"Compared with the {len(official['kfs'])} recreation forests on the Korea Forest Service website, {len(list_added)} are in neither the standard data nor the national facility data (e.g. Surakhyu in Nowon-gu, Seoul)",
        "Services using only the standard data show regions such as Seoul as having no forests, and newly opened forests cannot be found",
        "Require every designated recreation forest to be registered in the standard data, and add designation, opening and closing dates"),
)

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
    en=("Standard Data ↔ National Recreation Forest Facility Information",
        f"{len(nat_added)} of {len(nat_by_forest)} national forests are missing from the standard data",
        "Using only the standard data, many popular national forests cannot be found",
        "Include all national forests in the standard data and give both datasets a shared forest ID"),
)

log_issue(
    "국립자연휴양림 시설관련 정보",
    "전화번호 필드가 없고, 주차는 객실(상품)당 대수만 있어 전체 주차장·장애인 주차구역 규모를 알 수 없음",
    f"표준데이터에 없는 국립휴양림 {len(nat_added)}곳의 연락처를 찾으려면 별도 데이터셋(우선예약·추첨예약 정책)을 결합해야 함",
    "시설정보 데이터에 휴양림 대표 전화번호, 전체·장애인 주차면 수 필드 추가",
    en=("National Recreation Forest Facility Information",
        "No phone field, and parking is only given per room, so total and accessible parking are unknown",
        f"Finding phone numbers for the {len(nat_added)} national forests missing from the standard data needs another dataset (booking policy)",
        "Add the forest's main phone number and total/accessible parking spaces"),
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
    en=("National Recreation Forest Facility Information",
        "Room accessibility is only in free-text descriptions; no room mentions thresholds, grab bars or strollers",
        "Even text analysis cannot tell whether rooms and bathrooms are accessible",
        "Add structured room fields (entrance step, door width, bed/ondol, bathroom grab bars)"),
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
    en=("Barrier-free Trail Status ↔ Standard Data",
        "No shared ID, so trails can only be linked by straight-line distance",
        "Cannot tell a trail inside the forest from one in a nearby park",
        "Add a 'linked forest ID' field to the trail data (proposal 2)"),
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
    en=("Barrier-free Trail Status",
        "Only 8 fields (number, year, agency, project, address, coordinates, length); no slope, surface or width",
        "The 'barrier-free' name alone cannot tell whether a wheelchair can actually use the trail",
        "Add average/max slope, surface, usable width, rest-area spacing and toilet fields (proposal 2)"),
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
    en=("National Public Toilet Standard Data",
        f"The diaper station field is filled for only {diaper_filled} of {len(toilet_raw['rows']):,} toilets; {len(toilet_raw['rows']) - len(toilets):,} toilets have no coordinates",
        "Families with infants cannot find diaper stations near forests from public data",
        "Make a diaper station Y/N field mandatory and link toilets inside forests to the forest ID"),
)

# ---------------------------------------------------------------- 6-3. 지역 정규화·휴장 표시
# 숲나들e 하위 도메인 홈페이지는 접속하면 오류 화면으로 가므로 통합 주소로 바꾼다 (scripts/fetch_forest_list.py 참고)
FT_SUB = {k: v for k, v in (official.get("subdomains") or {}).items() if v}
fixed_home = []
for f in forests:
    m = re.search(r"([a-z0-9-]+)\.foresttrip\.go\.kr", f.get("homepage") or "")
    if m and m.group(1) in FT_SUB:
        f["homepage"] = f"https://www.foresttrip.go.kr/indvz/main.do?hmpgId={FT_SUB[m.group(1)]}"
        fixed_home.append(f["name"])
report.append(f"- 숲나들e 하위 도메인 홈페이지(접속 시 오류)를 통합 주소로 바꾼 곳: {len(fixed_home)}곳 – {', '.join(fixed_home)}\n")
if fixed_home:
    log_issue(
        "전국휴양림표준데이터 '홈페이지주소'",
        f"숲나들e 개별 하위 도메인 주소(예: godaesan.foresttrip.go.kr) {len(fixed_home)}곳이 접속하면 '요청하신 페이지를 찾을수 없습니다'로 이어짐",
        "예약하려고 홈페이지 링크를 누른 이용자가 오류 화면을 보고 예약 경로를 잃음",
        "홈페이지주소를 숲나들e 통합 주소(www.foresttrip.go.kr/indvz/main.do?hmpgId=…)로 갱신, 링크 유효성 정기 점검",
        en=("National Recreation Forest Standard Data 'homepage'",
            f"{len(fixed_home)} Foresttrip sub-domain addresses (e.g. godaesan.foresttrip.go.kr) lead to a 'page not found' error",
            "Visitors who click the website link to book end up on an error page",
            "Update to the unified Foresttrip address (www.foresttrip.go.kr/indvz/main.do?hmpgId=…) and check links regularly"),
    )

for f in forests:
    f["sido"], f["sigungu"] = region_of(f["address"], f["sido"])
    f["closed"] = "휴장" in f["name"] or bool(f.get("notOpen"))

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

# (9) 유아숲체험원 현황, (10) 치유의숲 현황: 이름에 휴양림명이 들어가고 같은 시·군·구이며 도로명이 다르지 않으면 '안', 아니면 같은 시·군·구
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
        froad = road_name(f.get("address"))

        def is_inside(p):
            if not (nn and len(nn) >= 2 and nn in norm_name(p["name"])):
                return False
            # 이름이 같아도 다른 시·군·구면 다른 곳 (예: 원주 백운산자연휴양림 ↔ 광양 백운산치유의숲)
            if f["sigungu"] and p["sigungu"] and p["sigungu"] != f["sigungu"]:
                return False
            # 둘 다 도로명이 있는데 다르면 휴양림 안으로 보지 않는다 (예: 서귀포자연휴양림 1100로 ↔ 서귀포 치유의 숲 산록남로)
            proad = road_name(p["address"])
            return not roads_differ(froad, proad)

        inside = [p for p in places if is_inside(p)]
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
    en=("National Forest Recreation Service data in general",
        "Forest names and agency ID formats ('101', '0101', 'ID02030103') differ between datasets, so joining needs an alias table",
        "Discounts, maps and safety checks for the same forest are hard to combine, and gaps go unnoticed",
        "Use one forest ID format across all datasets and give the standard data the same ID"),
)
log_issue(
    "국립자연휴양림 월별 안전점검표",
    "점검 항목에 계단 미끄럼방지·AED는 있으나 경사로·장애인 객실·장애인 화장실 상태 점검 항목은 없음",
    "보행약자가 가장 궁금한 시설의 최근 상태를 공공데이터로 확인할 수 없음",
    "안전점검표에 무장애 시설(경사로·장애인 객실 출입문·장애인 화장실) 점검 항목 추가",
    en=("National Recreation Forest Monthly Safety Checks",
        "Checks cover non-slip stairs and AEDs but not ramps, accessible rooms or accessible toilets",
        "The current state of the facilities people with limited mobility care about most is not in public data",
        "Add barrier-free items (ramps, accessible room doors, accessible toilets) to the checklist"),
)
log_issue(
    "유아숲체험원 현황 / 치유의숲 현황",
    "주소만 있고 위경도·휴양림 ID가 없음",
    "휴양림 안에 있는 시설인지 이름 일부와 시·군·구로만 추정 가능",
    "위경도와 소재 휴양림(산림휴양시설) ID 필드 추가",
    en=("Children's Forest Centers / Healing Forests",
        "Only addresses; no coordinates or forest ID",
        "Whether a place is inside a forest can only be guessed from its name and city/county",
        "Add coordinates and the ID of the forest it belongs to"),
)

# ---------------------------------------------------------------- 6-5. 외국인 이용자: 대중교통·이용수칙·아세안 우선예약
# (1) 버스정류장: 원본(22MB)이 있으면 휴양림 5km 이내만 추려 busstop_near.json으로 저장, 없으면 저장본 사용
BUS_CSV = os.path.join(RAW, "extra", "15067528.csv")
BUS_NEAR = os.path.join(RAW, "extra", "busstop_near.json")
if os.path.exists(BUS_CSV):
    raw_stops = []
    for r in csv.DictReader(open(BUS_CSV, encoding="cp949", newline="")):
        la, lo = fnum(r["위도"]), fnum(r["경도"])
        if la and lo:
            raw_stops.append((la, lo, r["정류장명"].strip(), r["도시명"].strip(), r["정보수집일"].strip()))
    bus_total = len(raw_stops)
    near = {}
    for la, lo, nm, city, d in raw_stops:
        for f in forests:
            if f["lat"] and abs(f["lat"] - la) < 0.05 and abs(f["lng"] - lo) < 0.06 and haversine(f["lat"], f["lng"], la, lo) <= 5:
                near[(round(la, 6), round(lo, 6), nm)] = {"name": nm, "lat": round(la, 6), "lng": round(lo, 6), "city": city, "date": d}
                break
    json.dump({"total": bus_total, "refDate": max(x[4] for x in raw_stops), "stops": list(near.values())},
              open(BUS_NEAR, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
bus = json.load(open(BUS_NEAR, encoding="utf-8"))
SOURCES["busstop"]["refDate"] = bus["refDate"]
EXTRA_ROWS["15067528"] = bus["total"]
bus_hist = Counter()
for f in forests:
    if not f["lat"]:
        continue
    near = sorted(
        ({**b, "distKm": round(haversine(f["lat"], f["lng"], b["lat"], b["lng"]), 2)} for b in bus["stops"]),
        key=lambda b: b["distKm"],
    )
    near = [b for b in near if b["distKm"] <= 3]
    # 같은 이름(길 건너편 정류장) 중복 제거
    seen, stops = set(), []
    for b in near:
        if b["name"] not in seen:
            seen.add(b["name"])
            stops.append({k: b[k] for k in ("name", "distKm", "city", "lat", "lng")})
    f["busStops"] = stops[:3]
    if stops:
        add_src(f, "busstop")
    d = stops[0]["distKm"] if stops else None
    bus_hist["1km 이내" if d is not None and d <= 1 else "1~3km" if d is not None else "3km 내 없음"] += 1
report.append("## 3-2. 버스정류장 연결 (직선거리)\n")
report.append(f"- 전국 정류장 {bus['total']:,}곳 중 휴양림 5km 이내 {len(bus['stops']):,}곳 사용")
report.append("- " + ", ".join(f"{k}: {v}곳" for k, v in bus_hist.items()) + "\n")
log_issue(
    "국토교통부_전국 버스정류장 위치정보",
    "TAGO에 연계된 시·군만 포함되고, 정류장별 노선·배차 정보가 없음",
    f"휴양림 {bus_hist['3km 내 없음']}곳은 3km 안에 정류장이 없거나 데이터가 없어 구분할 수 없음. 버스가 하루 몇 번 오는지 알 수 없음",
    "전 시·군 정류장 포함, 휴양림 진입로 기준 정류장·노선·첫차/막차 정보를 휴양림 데이터에 연결",
    en=("Nationwide Bus Stop Locations",
        "Only cities linked to TAGO are included, and there are no routes or timetables per stop",
        f"For {bus_hist['3km 내 없음']} forests we cannot tell whether there is no stop within 3 km or the data is missing; bus frequency is unknown",
        "Cover all cities and counties, and link the stop, routes and first/last bus at each forest entrance to forest data"),
)
log_issue(
    "국립자연휴양림 시설관련 정보 / 우선예약 및 추첨예약 정책",
    "외국인 회원가입·본인인증·결제·입실 신분증 정보가 없고, 입·퇴실 시간과 바비큐 제한은 객실 설명 자유서술에만 있음",
    "외국인 여행자가 예약할 수 있는지, 현장 규칙이 무엇인지 공공데이터로 미리 알 수 없음",
    "외국인 예약 가능 여부·인정 신분증·해외 카드 결제 필드와 입·퇴실·취사 규칙 구조화 필드 추가, 영문 병기",
    en=("National Recreation Forest Facility Information / Booking Policy",
        "No data on foreigner sign-up, identity check, payment or ID at check-in; check-in times and barbecue rules exist only in free text",
        "Foreign visitors cannot learn from public data whether they can book or what the on-site rules are",
        "Add fields for foreigner booking, accepted ID and foreign card payment, structured check-in and cooking rules, and English text"),
)


# (1-2) 철도역: 한국철도공사 역 위치(위도·경도) → 휴양림에서 가장 가까운 역 1곳 (30km 이내)
rail_rows = []
for r in csv.DictReader(open(os.path.join(RAW, "extra", "15127532.csv"), encoding="cp949", newline="")):
    la, lo = fnum(r["위도"]), fnum(r["경도"])
    if la and lo:
        rail_rows.append({"name": r["역명"].strip(), "lat": la, "lng": lo})
EXTRA_ROWS["15127532"] = len(rail_rows)
rail_hist = Counter()
for f in forests:
    if not f["lat"]:
        continue
    st = min(rail_rows, key=lambda x: haversine(f["lat"], f["lng"], x["lat"], x["lng"]))
    d = round(haversine(f["lat"], f["lng"], st["lat"], st["lng"]), 1)
    if d <= 30:
        f["rail"] = {"name": st["name"], "distKm": d, "lat": round(st["lat"], 6), "lng": round(st["lng"], 6)}
        add_src(f, "rail")
    rail_hist["10km 이내" if d <= 10 else "10~30km" if d <= 30 else "30km 넘음"] += 1
report.append("## 3-5. 철도역 연결 (직선거리)\n")
report.append(f"- 한국철도공사 역 {len(rail_rows)}곳. " + ", ".join(f"{k}: {v}곳" for k, v in rail_hist.items()) + "\n")

# (1-3) 관광안내소: KOTIS 개방데이터 1,250건 중 같은 읍·면 안내소 (주소에 좌표·시도가 없어 거리 계산 불가)
ti = json.load(open(os.path.join(RAW, "extra", "touristinfo_same_emd.json"), encoding="utf-8"))
EXTRA_ROWS["15151450"] = 1250
for f in forests:
    hit = ti["byForest"].get(f["id"])
    if hit:
        f["infoCenters"] = hit[:2]
        add_src(f, "touristinfo")
ti_n = sum(1 for f in forests if f.get("infoCenters"))
report.append(f"## 3-6. 관광안내소 연결\n\n- 같은 읍·면 안내소가 있는 휴양림 {ti_n}곳\n")
log_issue(
    "한국관광공사_전국관광안내소 정보",
    "좌표가 없고 주소가 읍·면부터 시작해 시·도·시·군을 알 수 없음. 공공데이터포털에서 바로 받을 수 없고 외부 화면에서 조회해야 함",
    f"거리로 연결할 수 없어 같은 읍·면에 있는 {ti_n}곳만 연결. 나머지 휴양림은 가까운 안내소가 있어도 빈칸",
    "위도·경도와 전체 도로명주소(시·도·시·군 포함)를 넣고, 포털에서 파일로 내려받을 수 있게 제공",
    en=("Nationwide Tourist Information Centers",
        "No coordinates, and addresses start at the town level, so the province and city are unknown. Not downloadable from the portal; it must be queried on an external screen",
        f"Cannot link by distance; only {ti_n} forests with a center in the same town are linked. Others stay blank even if a center is nearby",
        "Add coordinates and full road addresses including province and city, and offer a file download on the portal"),
)

# (2) 이용수칙: 국립휴양림 객실 설명에서 입·퇴실 시간과 바비큐(숯불) 제한 추출
def hour_of(txt, ampm_default):
    m = re.search(r"(오전|오후|낮|밤)?\s*(\d{1,2})\s*(?::\s*(\d{2})|시)", txt)
    if not m:
        return None
    h = int(m[2])
    ap = m[1] or ampm_default
    if ap in ("오후", "밤") and h < 12:
        h += 12
    return f"{h:02d}:{m[3] or '00'}"


def room_rules(rooms):
    cin, cend, cout, bbq = Counter(), Counter(), Counter(), Counter()
    for p in rooms:
        t = re.sub(r"[​﻿]", "", p["상품설명"])
        m = re.search(r"입실\s*(?:시간)?\s*[:：]\s*(.{0,30})", t)
        if m:
            seg = m[1]
            a = hour_of(seg, "오후")
            e = re.search(r"[-~]\s*(오후|밤)?\s*(\d{1,2})\s*시", seg)
            if a:
                cin[a] += 1
            if e:
                h = int(e[2])
                cend[f"{h + 12 if h < 12 else h:02d}:00"] += 1
        m = re.search(r"퇴실\s*(?:시간)?\s*[:：]\s*(.{0,30})", t)
        if m:
            h = hour_of(re.sub(r"익일\(퇴실일 기준\)", "다음날", m[1]), "오전")
            if h:
                cout[h] += 1
        if re.search(r"연중\s*(숯불|바비큐|바베큐|숯)[^.。]{0,20}(금지|불가)", t):
            bbq["yearRound"] += 1
        elif re.search(r"산불\s*조심\s*기간", t) and re.search(r"바비큐|바베큐|숯|화로|취사", t):
            bbq["fireSeason"] += 1
    top = lambda c: c.most_common(1)[0][0] if c else None
    return {
        "checkin": top(cin),
        "checkinEnd": top(cend),
        "checkout": top(cout),
        "bbq": top(bbq),
        "idCheck": any("신분증" in p["상품설명"] for p in rooms),
        "rooms": len(rooms),
    }


rules_count = 0
for f in forests:
    nat = f.get("national")
    if not nat:
        continue
    rooms = [p for p in nat_by_forest.get(nat["forestName"], []) if p["상품구분"] == "숙박"]
    if rooms:
        nat["rules"] = room_rules(rooms)
        rules_count += bool(nat["rules"]["checkin"])

# (3) 아세안 우선예약: 예약정책 데이터의 '아세안우선예약' 정책(객실명 = 나라명)
ASEAN_EN = {"라오스": "Laos", "말레이시아": "Malaysia", "미얀마": "Myanmar", "베트남": "Viet Nam", "브루나이": "Brunei",
            "싱가포르": "Singapore", "인도네시아": "Indonesia", "캄보디아": "Cambodia", "태국": "Thailand", "필리핀": "Philippines"}
asean_rows = [p for p in policy_rows if "아세안" in p["정책명"] and "우선예약" in p["정책명"]]
if asean_rows:
    f = find_forest(asean_rows[0]["기관명"])
    rooms = sorted({p["상품명"].strip() for p in asean_rows})
    countries = sorted({re.sub(r"\(.*?\)", "", r).strip() for r in rooms})
    wins = {}
    for p in asean_rows:
        m = re.match(r"(\d{4})년 (\d{2})월", p["정책명"])
        if m:
            a = p["신청기간"].split("~")
            wins[f"{m[1]}-{m[2]}"] = {"month": f"{m[1]}-{m[2]}", "applyFrom": a[0].strip(), "applyTo": a[-1].strip()}
    all_rooms = [r["name"] for r in (f.get("national") or {}).get("roomList", [])]
    f["asean"] = {
        "rooms": rooms,
        "countries": [{"ko": c, "en": ASEAN_EN.get(c, c)} for c in countries],
        "otherRooms": sorted(set(all_rooms) - set(rooms)),
        "windows": [wins[k] for k in sorted(wins)],
        "tel": asean_rows[0]["연락처"].strip(),
        "refDate": SOURCES["natpolicy"]["refDate"],
    }
    report.append(f"- 아세안 우선예약: {f['name']} 객실 {len(rooms)}실, {len(countries)}개국, {len(wins)}개월\n")

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
    "datasetsUsed": sum(1 for v in SOURCES.values() if not v.get("notPortal")),
    "officialListAdded": len(list_added),
    "officialListTotal": len(official["kfs"]),
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
        "busstop": bus["total"],
        "rail": EXTRA_ROWS["15127532"],
        "touristinfo": EXTRA_ROWS["15151450"],
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
