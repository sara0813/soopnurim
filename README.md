# 숲누림

휠체어 이용자·고령자·유아 동반 가족이 자연휴양림에 가기 전에, 주차부터 숲길까지 확인된 정보와 아직 모르는 정보(빈칸)를 출처와 함께 보여 주고, 빈칸은 운영기관에 물어볼 질문과 이용자 제보로 잇는 서비스입니다. 「산림공공데이터 어디까지 써봤니」 활용사례 공모(서비스형) 출품작.

- 서비스: https://soopnurim.vercel.app
- 데이터 출처와 항목별 근거: https://soopnurim.vercel.app/data
- 전국 빈칸 통계와 데이터 개선 의견: https://soopnurim.vercel.app/gaps

## 한눈에 보는 수치

| 항목 | 값 |
|---|---|
| 결합한 공공데이터 | 16종 (산림 분야 14종) |
| 휴양림 | 200곳 = 표준데이터 168곳 + 표준데이터에 없는 국립자연휴양림 32곳 |
| 여정 항목 | 6단계 23개 |
| 200곳 모두 빈칸인 항목 | 23개 중 9개 |

수치는 `python -I scripts/build_data.py`를 실행할 때 `src/data/stats.json`에 다시 계산되고, 화면은 이 파일을 읽어 표시합니다.

## 사용 데이터 (data/raw)

모두 공공데이터포털에서 파일로 내려받았고(파일데이터·표준데이터), 이용허락범위는 '제한 없음'입니다. 화면을 볼 때 외부 API를 실시간으로 부르지 않습니다.

| 파일 | 데이터셋 | 원본 건수 |
|---|---|---|
| `forest_std.json` | [전국휴양림표준데이터](https://www.data.go.kr/data/15013111/standard.do) | 186건 |
| `nanumgil.csv` (cp949) | [한국산림복지진흥원_무장애나눔길 조성정보](https://www.data.go.kr/data/15063418/fileData.do) | 167건 |
| `extra/15064419.csv` | [국립자연휴양림 시설관련 정보](https://www.data.go.kr/data/15064419/fileData.do) | 2,219건 |
| `extra/15091720.csv` | [국립자연휴양림 우선예약 및 추첨예약 정책](https://www.data.go.kr/data/15091720/fileData.do) | 27,192건 |
| `extra/15064415.csv` | [국립자연휴양림 홍보](https://www.data.go.kr/data/15064415/fileData.do) | 47건 |
| `extra/15091721.csv` | [국립자연휴양림 배치도 및 상세배치도](https://www.data.go.kr/data/15091721/fileData.do) | 2,158건 |
| `extra/15113383.csv` | [숲나들e 휴양림할인정책정보](https://www.data.go.kr/data/15113383/fileData.do) | 319건 |
| `extra/15127491.csv` | [주말추첨경쟁률](https://www.data.go.kr/data/15127491/fileData.do) | 556건 |
| `extra/15127656.csv` | [휴양림통합가동률현황](https://www.data.go.kr/data/15127656/fileData.do) | 45건 |
| `extra/15113553.csv` | [휴양림공사이력정보](https://www.data.go.kr/data/15113553/fileData.do) | 3,070건 |
| `extra/15113558.csv` | [숲나들e 이용불가정보 및 위약금면제정보](https://www.data.go.kr/data/15113558/fileData.do) | 136건 |
| `extra/15128911.csv` | [월별안전점검표](https://www.data.go.kr/data/15128911/fileData.do) | 36,624건 |
| `extra/15081674.csv` | [산림청_유아숲체험원 현황](https://www.data.go.kr/data/15081674/fileData.do) | 499건 |
| `extra/15107928.csv` | [산림청_치유의숲 현황](https://www.data.go.kr/data/15107928/fileData.do) | 38건 |
| `extra/toilet_std_slim.json` | [전국공중화장실표준데이터](https://www.data.go.kr/data/15012892/standard.do) | 33,820건 |
| `extra/15075170.csv`, `extra/15075196.csv` (cp949) | [제주특별자치도_무장애여행정보](https://www.data.go.kr/data/15075196/fileData.do) (붉은오름·서귀포자연휴양림) | 현장조사 2곳 |

`extra/`의 나머지 파일(15061976, 15063417, 15110279, 15113562)은 검토만 하고 쓰지 않았습니다.

> 기획서 초안의 `15145502`는 '충청남도 논산시_휴양림'(지역 데이터)이라 전국 데이터인 `15013111`로 바꿨습니다.

## 데이터 가공

```bash
python -I scripts/build_data.py
```

- 표준데이터 중복 정리(정규화한 이름이 같고 2km 이내면 같은 곳, 기준일이 최신인 기록 유지): 186건 → 168곳 (중복 18건)
- 국립자연휴양림 시설정보 결합: 45곳 중 13곳은 표준데이터와 매칭, 표준데이터에 없는 32곳 추가 → 총 200곳
- 국립자연휴양림관리소 데이터 9종을 휴양림명(별칭표)으로 연결
- 공통 ID가 없는 데이터는 좌표·주소로 연결: 무장애나눔길 3km(0.5km 이내 17곳, 3km 이내 25곳), 공중화장실 1.5km, 유아숲체험원·치유의숲은 이름과 시·군·구
- 객실 설명·주요시설명·공사명 텍스트에서 키워드 추출
- 출력: `src/data/forests.json`, `src/data/stats.json`, `data/analysis/report.md`(결측률·개선 의견 로그)

## 운영자 전화 확인 입력

`src/data/operator_checks.json`에 휴양림 이름을 키로 추가하면 해당 항목이 '운영자 확인'으로 바뀝니다. 항목 key는 `src/lib/journey.ts` 참고.

## 이용자 제보 저장

- `KV_REST_API_URL`·`KV_REST_API_TOKEN`(또는 `UPSTASH_REDIS_REST_URL`·`UPSTASH_REDIS_REST_TOKEN`)이 있으면 Upstash Redis에 저장합니다. 만료 시간을 두지 않아 지우기 전까지 남습니다.
- 없으면 로컬 개발은 `.data/reports.json`, 배포 환경은 메모리(시연 모드, 재배포하면 사라짐)에 저장합니다.
- `ADMIN_TOKEN`이 있으면 `/api/reports/hide`로 제보를 숨기거나 되살릴 수 있습니다.

## 개발

```bash
npm run dev     # http://localhost:3000
npm run build
```

Next.js 15 (App Router, 전 페이지 정적 생성) · Tailwind 4 · Leaflet(OpenStreetMap) · PWA(manifest + service worker)
