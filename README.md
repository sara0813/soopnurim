# 🌲 숲누림

갈 수 있는 숲의 '정보 빈칸'을 찾고 채우는 서비스 — 「산림공공데이터 어디까지 써봤니」 활용사례 공모(서비스형) 출품작.

## 사용 데이터 (data/raw)

| 파일 | 데이터셋 | 비고 |
|---|---|---|
| `forest_std.json` | [전국휴양림표준데이터](https://www.data.go.kr/data/15013111/standard.do) | 186건, 레코드별 기준일 |
| `nanumgil.csv` (cp949) | [한국산림복지진흥원_무장애나눔길 조성정보](https://www.data.go.kr/data/15063418/fileData.do) | 167건, 2025-12-31 |
| `extra/15064419.csv` | [국립자연휴양림관리소_국립자연휴양림 시설관련 정보](https://www.data.go.kr/data/15064419/fileData.do) | 객실·야영 상품 2,219건, 45곳 |
| `extra/15075170.csv`, `extra/15075196.csv` (cp949) | 제주특별자치도_무장애여행정보 (붉은오름·서귀포자연휴양림) | 현장조사 2020-12-22 |
| `extra/` 기타 | 치유의숲 현황·좌표, 숲길정보, 나눔숲 등 | 확장 후보(미사용) |

모두 공공데이터포털 '이용허락범위 제한 없음'.

> ⚠️ 기획서의 `15145502`는 '충청남도 논산시_휴양림'(지역 데이터)이라 전국 데이터인 `15013111`로 교체했습니다.

## 데이터 가공

```bash
python -I scripts/build_data.py
```

- 표준데이터 중복 정리(정규화 이름 동일 + 2km 이내 → 최신 기준일 유지): 186건 → 169곳
- 국립자연휴양림 시설정보 결합: 13곳 매칭, 표준데이터에 없는 32곳 추가 → 총 201곳
- 무장애나눔길 좌표 매칭(공통 ID 없음): 0.5km 이내 17곳, 3km 이내 25곳
- 객실 설명·주요시설명 텍스트 키워드 추출
- 출력: `src/data/forests.json`, `src/data/stats.json`, `data/analysis/report.md`(결측률·개선 의견 로그)

## 운영자 전화 확인(🔵) 입력

`src/data/operator_checks.json`에 휴양림 이름을 키로 추가하면 해당 항목이 '운영자 확인'으로 바뀝니다. 항목 key는 `src/lib/journey.ts` 참고.

## 개발

```bash
npm run dev     # http://localhost:3000
npm run build
```

Next.js 15 (App Router, 전 페이지 정적 생성) · Tailwind 4 · Leaflet(OpenStreetMap) · PWA(manifest + service worker)
