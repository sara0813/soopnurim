/**
 * 국어의 로마자 표기법(2000, 문화체육관광부 고시) 간이 구현.
 * 받침과 다음 글자 첫소리 사이의 연음·비음화·유음화만 반영한다(고유명사 표기용).
 * 휴양림 이름·지명을 영어 화면에서 읽을 수 있게 하는 용도이며, 한글 원문을 항상 함께 보여 준다.
 */
const INI = ["g", "kk", "n", "d", "tt", "r", "m", "b", "pp", "s", "ss", "", "j", "jj", "ch", "k", "t", "p", "h"];
const MED = ["a", "ae", "ya", "yae", "eo", "e", "yeo", "ye", "o", "wa", "wae", "oe", "yo", "u", "wo", "we", "wi", "yu", "eu", "ui", "i"];
// 받침 대표음: 0 없음
const FIN = ["", "k", "k", "k", "n", "n", "n", "t", "l", "k", "m", "l", "l", "l", "l", "l", "m", "p", "p", "t", "t", "ng", "t", "t", "k", "t", "p", "t"];
// 다음 글자가 모음(ㅇ)으로 시작할 때 넘어가는 받침 소리
const LIAISON = ["", "g", "kk", "ks", "n", "nj", "n", "d", "r", "lg", "lm", "lb", "ls", "lt", "lp", "r", "m", "b", "ps", "s", "ss", "ng", "j", "ch", "k", "t", "p", ""];

type Syl = { i: number; m: number; f: number } | { raw: string };

function split(s: string): Syl[] {
  return [...s].map((ch) => {
    const c = ch.charCodeAt(0) - 0xac00;
    if (c < 0 || c > 11171) return { raw: ch };
    return { i: Math.floor(c / 588), m: Math.floor((c % 588) / 28), f: c % 28 };
  });
}

/** 한 단어(공백 없음)를 로마자로 */
export function romanizeWord(word: string): string {
  const syl = split(word);
  let out = "";
  for (let k = 0; k < syl.length; k++) {
    const s = syl[k];
    if ("raw" in s) {
      out += s.raw;
      continue;
    }
    const prev = k > 0 ? syl[k - 1] : null;
    const next = k + 1 < syl.length ? syl[k + 1] : null;
    // 첫소리
    let ini = INI[s.i];
    if (prev && !("raw" in prev) && prev.f) {
      const pf = FIN[prev.f];
      if (s.i === 11) ini = ""; // 연음은 앞 받침에서 처리
      else if (s.i === 5) ini = pf === "l" || pf === "n" ? "l" : "n"; // ㄹ: 유음화 / 비음화
      else if (s.i === 18 && ["k", "t", "p"].includes(pf)) ini = ""; // 거센소리되기: 앞 받침에서 처리
    } else if (s.i === 5 && k === 0) {
      ini = "r";
    }
    out += ini + MED[s.m];
    // 받침
    if (s.f) {
      const nx = next && !("raw" in next) ? next : null;
      let fin = FIN[s.f];
      if (nx) {
        if (nx.i === 11) fin = LIAISON[s.f];
        else if (nx.i === 2 || nx.i === 6) fin = fin === "k" ? "ng" : fin === "t" ? "n" : fin === "p" ? "m" : fin; // 비음화
        else if (nx.i === 5) fin = fin === "k" ? "ng" : fin === "p" ? "m" : fin === "l" || fin === "n" ? "l" : fin; // ㄹ 앞
        else if (nx.i === 18 && ["k", "t", "p"].includes(fin)) fin = fin === "k" ? "kh" : fin === "t" ? "th" : "ph";
        if (s.f === 27 && nx.i !== 11) fin = ""; // ㅎ 받침
      }
      out += fin;
    }
  }
  return out;
}

const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

/** 문장 속 한글 낱말을 로마자로 (첫 글자 대문자) */
export function romanize(text: string): string {
  return text.replace(/[가-힣]+/g, (w) => cap(romanizeWord(w)));
}

/** 이름 끝의 시설 종류 → 영어 (긴 것부터) */
const SUFFIX: [RegExp, string][] = [
  [/자연휴양림$/, "Natural Recreation Forest"],
  [/자연휴양관$/, "Natural Recreation Lodge"],
  [/휴양림$/, "Recreation Forest"],
  [/산림욕장$/, "Forest Bathing Park"],
  [/숲속야영장$/, "Forest Campground"],
  [/야영장$/, "Campground"],
  [/치유의\s?숲$/, "Healing Forest"],
  [/산림휴양마을$/, "Forest Recreation Village"],
  [/숲체험휴양마을$/, "Forest Experience Village"],
  [/산림문화타운$/, "Forest Culture Town"],
  [/자연생태공원$/, "Natural Ecology Park"],
  [/가족휴가촌$/, "Family Holiday Village"],
  [/숲속문화촌$/, "Forest Culture Village"],
];
/** 이름 안의 외래어·일반 낱말 */
const WORD: [RegExp, string][] = [
  [/아세안/g, " ASEAN "],
  [/케이블카/g, " Cable Car "],
  [/항노화/g, " Anti-aging "],
  [/힐링랜드/g, " Healing Land "],
  [/캠핑랜드/g, " Camping Land "],
  [/산림레포츠파크/g, " Forest Leisure Sports Park "],
  [/쉬자파크/g, " Swija Park "],
  [/에코둥지/g, " Eco Dungji "],
  [/밸리/g, " Valley "],
  [/알프스/g, " Alps "],
  [/임시 미운영/g, " Temporarily closed "],
  [/휴장/g, " Closed "],
];

/** 휴양림 이름 영어 표기. 예: 아세안자연휴양림 → ASEAN Natural Recreation Forest */
export function forestNameEn(name: string): string {
  let core = name.trim();
  let paren = "";
  const m = core.match(/\((.*?)\)/);
  if (m) {
    paren = m[1].trim();
    core = core.replace(m[0], "").trim();
  }
  let national = false;
  if (core.startsWith("국립")) {
    national = true;
    core = core.slice(2);
  }
  let suffix = "";
  for (const [re, en] of SUFFIX) {
    if (re.test(core)) {
      suffix = en;
      core = core.replace(re, "").trim();
      break;
    }
  }
  const conv = (s: string) => {
    let t = s;
    for (const [re, en] of WORD) t = t.replace(re, en);
    return t
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => (/^[가-힣]+(시|군)$/.test(w) ? placeEn(w) : /[가-힣]/.test(w) ? cap(romanizeWord(w)) : w))
      .join(" ");
  };
  const parts = [national ? "National" : "", conv(core), suffix].filter(Boolean).join(" ");
  if (!paren) return parts;
  const p = paren.replace(/(.+?)(시|군)$/, "$1");
  return `${parts} (${conv(p)})`;
}

const UNIT: Record<string, string> = {
  시: "si",
  군: "gun",
  구: "gu",
  읍: "eup",
  면: "myeon",
  동: "dong",
  리: "ri",
  로: "ro",
  길: "gil",
  가: "ga",
};

/** 행정구역 이름: 양주시 → Yangju-si */
export function placeEn(name: string): string {
  const m = name.match(/^([가-힣]+?)(시|군|구|읍|면|동|리|로|길)$/);
  if (m && m[1].length >= 1) return `${cap(romanizeWord(m[1]))}-${UNIT[m[2]]}`;
  return romanize(name);
}

const SIDO_EN: Record<string, string> = {
  서울특별시: "Seoul",
  부산광역시: "Busan",
  대구광역시: "Daegu",
  인천광역시: "Incheon",
  광주광역시: "Gwangju",
  대전광역시: "Daejeon",
  울산광역시: "Ulsan",
  세종특별자치시: "Sejong",
  경기도: "Gyeonggi-do",
  강원특별자치도: "Gangwon State",
  충청북도: "Chungcheongbuk-do",
  충청남도: "Chungcheongnam-do",
  전북특별자치도: "Jeonbuk State",
  전남광주통합특별시: "Jeonnam-Gwangju",
  전라남도: "Jeollanam-do",
  경상북도: "Gyeongsangbuk-do",
  경상남도: "Gyeongsangnam-do",
  제주특별자치도: "Jeju",
};
export const sidoEn = (name: string) => SIDO_EN[name] ?? romanize(name);

/** 주소 영어 표기 (도로명 순서는 그대로, 길찾기·택시용 한글 주소를 함께 보여 줄 것) */
export function addressEn(addr: string): string {
  return addr
    .split(/\s+/)
    .map((tok) => (SIDO_EN[tok] ? SIDO_EN[tok] : /^[가-힣]+$/.test(tok) ? placeEn(tok) : romanize(tok)))
    .join(" ");
}

/** 화면 언어에 맞는 휴양림 이름 */
export const nameOf = (lang: "ko" | "en", name: string) => (lang === "en" ? forestNameEn(name) : name);

/** 화면 언어에 맞는 지역 표시 (영어는 작은 단위부터) */
export const regionOf = (lang: "ko" | "en", sido: string, sigungu: string) =>
  lang === "en" ? [sigungu ? placeEn(sigungu) : "", sidoEn(sido)].filter(Boolean).join(", ") : `${sido} ${sigungu}`.trim();
