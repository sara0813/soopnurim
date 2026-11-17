"""
숲누림 원본 데이터 다운로드 (공공데이터포털 data.go.kr)

실행: python -I scripts/fetch_data.py [데이터키 ...]   (인자 없으면 전체)
저장: data/raw/

공공데이터포털 화면의 '다운로드' 버튼과 같은 경로를 사용합니다.
- 파일데이터: 상세 페이지의 fn_fileDataDown → selectFileDataDownload.do → fileDownload.do
- 표준데이터: /download/columList.json → /download/standard.json (10,000건 단위)
"""
import json
import math
import os
import re
import sys
import urllib.parse
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, "data", "raw")

# key: (유형, 공공데이터포털 번호, 저장 경로)
DATASETS = {
    "forest_std": ("standard", "15013111", "forest_std.json"),
    "nanum": ("file", "15063418", "nanumgil.csv"),
    "natfac": ("file", "15064419", "extra/15064419.csv"),
    "natpolicy": ("file", "15091720", "extra/15091720.csv"),
    "jeju_red": ("file", "15075170", "extra/15075170.csv"),
    "jeju_seogwipo": ("file", "15075196", "extra/15075196.csv"),
    "toilet": ("standard", "15012892", "extra/toilet_std_slim.json"),
    # 산림청 국립자연휴양림관리소 · 산림청 추가 데이터
    "natintro": ("file", "15064415", "extra/15064415.csv"),
    "natlayout": ("file", "15091721", "extra/15091721.csv"),
    "natdiscount": ("file", "15113383", "extra/15113383.csv"),
    "natcompetition": ("file", "15127491", "extra/15127491.csv"),
    "natoccupancy": ("file", "15127656", "extra/15127656.csv"),
    "natworks": ("file", "15113553", "extra/15113553.csv"),
    "natclosure": ("file", "15113558", "extra/15113558.csv"),
    "natsafety": ("file", "15128911", "extra/15128911.csv"),
    "kidsforest": ("file", "15081674", "extra/15081674.csv"),
    "healing": ("file", "15107928", "extra/15107928.csv"),
    # 22MB 원본은 커밋하지 않음(.gitignore). build_data.py가 휴양림 5km 이내 정류장만 busstop_near.json으로 남긴다.
    "busstop": ("file", "15067528", "extra/15067528.csv"),
}

# 공중화장실(3만여 건)은 숲누림에 필요한 필드만 남겨 저장
TOILET_FIELDS = [
    "화장실명", "소재지도로명주소", "소재지지번주소", "남성용-장애인용대변기수", "남성용-장애인용소변기수",
    "여성용-장애인용대변기수", "남성용-어린이용대변기수", "여성용-어린이용대변기수", "기저귀교환대장소",
    "개방시간", "관리기관명", "전화번호", "위도", "경도", "데이터기준일자",
]

UA = {"User-Agent": "Mozilla/5.0", "X-Requested-With": "XMLHttpRequest"}


def get(url, referer=None):
    h = dict(UA)
    if referer:
        h["Referer"] = referer
    return urllib.request.urlopen(urllib.request.Request(url, headers=h), timeout=120).read()


def fetch_file(pk, out):
    page = get(f"https://www.data.go.kr/data/{pk}/fileData.do").decode("utf-8", "ignore")
    m = re.search(r"fn_fileDataDown\('(\d+)', '([^']+)', '([^']*)','(\d+)'", page)
    q = urllib.parse.urlencode(
        {"publicDataPk": m[1], "publicDataDetailPk": m[2], "fileDetailSn": m[4], "publicDataTyCode": "PR0051"}
    )
    meta = json.loads(get("https://www.data.go.kr/tcs/dss/selectFileDataDownload.do?" + q))
    data = get(
        f"https://www.data.go.kr/cmm/cmm/fileDownload.do?atchFileId={meta['atchFileId']}"
        f"&fileDetailSn={meta['fileDetailSn']}&dataNm=x"
    )
    open(out, "wb").write(data)
    return len(data)


def fetch_standard(pk, out, keep=None):
    ref = f"https://www.data.go.kr/data/{pk}/standard.do"
    head = json.loads(get(f"https://www.data.go.kr/download/columList.json?pk={pk}&ext=CSV", ref))
    t = head["tableVO"]
    cols = t["colNmList"] if isinstance(t["colNmList"], list) else [t["colNmList"]]
    rows = []
    for page in range(1, math.ceil(head["totalCount"] / 10000) + 1):
        q = [("colNmList", c) for c in cols] + [
            ("totalCount", head["totalCount"]), ("svcTableNm", t["svcTableNm"]), ("perPage", 10000), ("page", page)
        ]
        rows += json.loads(get(f"https://www.data.go.kr/download/standard.json?publicDataPk={pk}&" + urllib.parse.urlencode(q), ref))
    header = head["columList"]
    if keep:
        code = {c["columNm"]: c["columCode"] for c in header}
        header = [c for c in header if c["columNm"] in keep]
        rows = [{code[k]: r.get(code[k]) for k in keep} for r in rows]
    json.dump({"name": head["fileName"], "header": header, "rows": rows}, open(out, "w", encoding="utf-8"), ensure_ascii=False)
    return len(rows)


if __name__ == "__main__":
    keys = sys.argv[1:] or list(DATASETS)
    for k in keys:
        kind, pk, rel = DATASETS[k]
        out = os.path.join(RAW, rel)
        os.makedirs(os.path.dirname(out), exist_ok=True)
        if kind == "file":
            print(k, pk, "bytes", fetch_file(pk, out))
        else:
            print(k, pk, "rows", fetch_standard(pk, out, TOILET_FIELDS if k == "toilet" else None))
