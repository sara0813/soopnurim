"""
전국 자연휴양림 공식 목록 수집 (누락 휴양림 찾기용)

전국휴양림표준데이터(15013111)는 지자체가 각자 올리는 방식이라, 등록하지 않은 휴양림(예: 서울 노원구 수락휴)이 빠진다.
그래서 다음 두 공식 목록과 대조해 빠진 곳을 채운다.
  1) 산림청 누리집 '자연휴양림 찾기' (국립·지자체·개인 자연휴양림 전체 목록: 이름·주소·전화)
  2) 숲나들e 첫 화면 지도의 휴양림 목록 (산림청 통합예약시스템에 등록된 곳)

실행:
  python -I scripts/fetch_forest_list.py            # 목록 내려받기 → data/raw/extra/forest_list_official.json
  python -I scripts/fetch_forest_list.py --geocode  # build_data.py가 남긴 '좌표 없는 추가 휴양림'만 주소로 좌표 찾기
                                                    # → data/raw/extra/forest_geocode.json (OpenStreetMap Nominatim, 1초 1건)
"""
import html
import http.client
import json
import os
import re
import sys
import time
import urllib.parse
import urllib.request
from datetime import date

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EXTRA = os.path.join(ROOT, "data", "raw", "extra")
OUT = os.path.join(EXTRA, "forest_list_official.json")
UNMATCHED = os.path.join(EXTRA, "forest_list_unmatched.json")
GEO = os.path.join(EXTRA, "forest_geocode.json")

UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130 Safari/537.36"}
KFS = "https://www.forest.go.kr/kfsweb/kfi/kfs/foreston/main/contents/CmpngInfo/selectCmpngInfoList.do"
# restMngmeMnbdCd: 001 국립, 002 지자체(공립), 003 개인(사립)
KFS_KIND = {"001": ("AR02_01_01_03", "국유림"), "002": ("AR02_01_01_04", "공유림"), "003": ("AR02_01_01_05", "사유림")}
FORESTTRIP = "https://www.foresttrip.go.kr/main.do?hmpgId=FRIP"


def get(url, headers=UA):
    for _ in range(5):
        try:
            return urllib.request.urlopen(urllib.request.Request(url, headers=headers), timeout=60).read().decode("utf-8", "ignore")
        except http.client.IncompleteRead as e:  # 산림청 누리집은 응답 끝이 잘리는 경우가 있어, 표가 다 왔으면 그대로 쓴다
            if b"</tbody>" in e.partial:
                return e.partial.decode("utf-8", "ignore")
        except Exception:
            pass
        time.sleep(2)
    raise RuntimeError(url)


def cell_text(s):
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", s))).strip()


def fetch_kfs():
    out = []
    for code, (mn, owner) in KFS_KIND.items():
        q = urllib.parse.urlencode({"mn": mn, "mntIndex": 1, "mntUnit": 300, "restTpcd": "01", "restMngmeMnbdCd": code})
        s = get(f"{KFS}?{q}")
        body = s[s.find("<tbody"): s.find("</tbody>")]
        for tr in re.findall(r"<tr[^>]*>(.*?)</tr>", body, re.S):
            tds = [cell_text(td) for td in re.findall(r"<td[^>]*>(.*?)</td>", tr, re.S)]
            if len(tds) < 5:
                continue
            links = [html.unescape(h).replace("http://https://", "https://") for h in re.findall(r'href="([^"]+)"', tr)]
            out.append({
                "kind": tds[1], "ownership": owner, "name": tds[2],
                "address": re.sub(r"^주소\s*", "", tds[3]), "tel": tds[4],
                "homepage": next((h for h in links if h.startswith("http")), ""),
            })
        print("산림청", code, owner, sum(1 for x in out if x["ownership"] == owner))
    return out


def fetch_foresttrip():
    s = get(FORESTTRIP)
    out = {}
    for m in re.finditer(r"\{\s*name:\s*'([^']*)'(.*?)\}", s, re.S):
        t = re.search(r"fn_goRsvrtTheme\(\\'(\d)\\',\s*\\'(ID\d+)\\',\s*\\'([^\\]*)\\'", m.group(2))
        if t:
            out[t.group(2)] = {"insttId": t.group(2), "name": t.group(3).strip()}
    print("숲나들e", len(out))
    return list(out.values())


def fetch_foresttrip_detail(instt):
    """숲나들e 휴양림 누리집 아래쪽의 주소·전화"""
    s = cell_text(get(f"https://www.foresttrip.go.kr/indvz/main.do?hmpgId={instt}"))
    a = re.search(r"주소\s*:\s*(?:\(우\s*\d+\s*\)\s*)?(.+?)\s*\|\s*전화\s*:\s*([\d-]+)", s)
    return {"address": a.group(1).strip(), "tel": a.group(2)} if a else {}


def foresttrip_coords(hmpg):
    """숲나들e 휴양림 누리집 '찾아오시는 길' 지도 좌표 (국립 시설정보 좌표와 같은 공식 값)"""
    s = get(f"https://www.foresttrip.go.kr/pot/fi/dr/selectDrctnsDtlView.do?hmpgId={hmpg}&menuId=002007")
    m = re.search(r"(3[3-8]\.\d{4,})[^0-9]{1,40}(12[4-9]\.\d{4,})", s)
    return (float(m.group(1)), float(m.group(2))) if m else None


def nominatim(name, address):
    """숲나들e에 없는 곳만: OpenStreetMap에서 시설(휴양림·관광지·건물) 단위로 잡힌 결과만 쓴다.
    도로·마을·산 같은 넓은 대상은 실제 위치와 수 km 차이가 날 수 있어 버린다."""
    addr = re.sub(r"\s*\(.*?\)", "", address)
    sgg = next((t for t in addr.split() if re.search(r"(시|군)$", t)), "")
    base = re.sub(r"\(.*?\)|\s", "", name)
    for q in (base, re.sub(r"자연휴양림|휴양림", "", base) + " 휴양림", addr):
        url = "https://nominatim.openstreetmap.org/search?" + urllib.parse.urlencode(
            {"q": q, "format": "json", "limit": 5, "countrycodes": "kr", "accept-language": "ko"})
        r = json.loads(get(url, {"User-Agent": "soopnurim-data-build/1.0"}))
        time.sleep(1.1)
        for x in r:
            if sgg and sgg not in x.get("display_name", ""):
                continue
            if x.get("class") in ("highway", "place", "natural", "boundary", "amenity", "shop"):
                continue
            return {"lat": float(x["lat"]), "lng": float(x["lon"]), "source": "osm", "query": q,
                    "label": x.get("display_name", ""), "osmClass": f"{x.get('class')}/{x.get('type')}"}
    return None


def resolve_subdomains(hosts):
    """숲나들e 개별 하위 도메인(예: godaesan.foresttrip.go.kr)은 첫 화면이 /main.do로 넘기는데 그 주소가 404라
    이용자에게 '요청하신 페이지를 찾을수 없습니다'가 뜬다(2026-11-18 확인). 첫 화면의 hmpgId를 읽어
    통합 주소(www.foresttrip.go.kr/indvz/main.do?hmpgId=…)로 바꿀 수 있게 표를 만든다.
    일부 하위 도메인은 중간 인증서를 보내지 않아 파이썬 대신 curl(윈도 인증서 저장소)로 읽는다."""
    import subprocess
    out = {}
    for h in sorted(hosts):
        try:
            html_ = subprocess.run(["curl", "-s", "-m", "20", f"https://{h}.foresttrip.go.kr/"], capture_output=True, timeout=30).stdout.decode("utf-8", "ignore")
        except Exception:
            html_ = ""
        m = re.search(r"hmpgId=([A-Za-z0-9]+)", html_)
        out[h] = m.group(1) if m else None
        print("하위 도메인", h, "→", out[h])
    return out


def geocode():
    """build_data.py가 남긴 '좌표 없는 추가 휴양림'의 좌표 찾기. 결과는 캐시해 다시 묻지 않는다 (--refresh면 다시)."""
    todo = json.load(open(UNMATCHED, encoding="utf-8"))
    cache = {} if "--refresh" in sys.argv or not os.path.exists(GEO) else json.load(open(GEO, encoding="utf-8"))
    ft = json.load(open(OUT, encoding="utf-8"))["foresttrip"]
    key = lambda n: re.sub(r"\s|\(.*?\)|자연휴양림|휴양림", "", n)
    for f in todo:
        if cache.get(f["name"]):
            continue
        hmpg = re.search(r"hmpgId=(\w+)", f.get("homepage") or "")
        hmpg = hmpg.group(1) if hmpg else next(
            (e["insttId"] for e in ft if key(e["name"]) and (key(e["name"]) == key(f["name"]) or key(e["name"]) in key(f["name"]))), None)
        hit = None
        if hmpg:
            c = foresttrip_coords(hmpg)
            if c:
                hit = {"lat": c[0], "lng": c[1], "source": "foresttrip", "hmpgId": hmpg}
        if not hit:
            hit = nominatim(f["name"], f["address"])
        cache[f["name"]] = hit
        print(f["name"], "→", hit and (hit["source"], round(hit["lat"], 5), round(hit["lng"], 5), hit.get("label", "")[:50]))
    json.dump(cache, open(GEO, "w", encoding="utf-8"), ensure_ascii=False, indent=1)


if __name__ == "__main__":
    os.makedirs(EXTRA, exist_ok=True)
    if "--geocode" in sys.argv:
        geocode()
        sys.exit()
    kfs = fetch_kfs()
    ft = fetch_foresttrip()
    # 산림청 목록에 없는 숲나들e 휴양림만 각 누리집에서 주소·전화를 읽어 둔다
    key = lambda n: re.sub(r"\s|\(.*?\)|자연휴양림|휴양림", "", n)
    kfs_keys = {key(x["name"]) for x in kfs} | {key(p) for x in kfs for p in re.findall(r"\((.*?)\)", x["name"])}
    for e in ft:
        k = key(e["name"])
        if "휴양림" in e["name"] and not any(k == kk or (len(k) >= 3 and (k in kk or kk in k)) for kk in kfs_keys):
            e.update(fetch_foresttrip_detail(e["insttId"]))
            print("숲나들e에만 있음:", e["name"], e.get("address"), e.get("tel"))
            time.sleep(0.5)
    # 표준데이터·산림청 목록에 적힌 숲나들e 하위 도메인 → 통합 주소 hmpgId
    std = json.load(open(os.path.join(ROOT, "data", "raw", "forest_std.json"), encoding="utf-8"))["rows"]
    homes = [x.get("homepage") or "" for x in kfs] + [r.get("HOMEPAGE_URL") or "" for r in std]
    hosts = {m.group(1) for h in homes for m in [re.search(r"([a-z0-9-]+)\.foresttrip\.go\.kr", h)] if m and m.group(1) != "www"}
    subdomains = resolve_subdomains(hosts)
    json.dump({"refDate": date.today().isoformat(), "kfs": kfs, "foresttrip": ft, "subdomains": subdomains},
              open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("저장", OUT)
