import Link from "next/link";
import { href, type Lang } from "@/lib/i18n";

const DIFF: [string, string, string, string][] = [
  [
    "여정 전체를 한 화면에",
    "예약 → 도착 → 진입로 → 객실 → 화장실 → 숲길 → 안전",
    "The whole trip on one screen",
    "Booking → arrival → entrance → room → toilet → trail → safety",
  ],
  [
    "근거를 섞지 않고 표시",
    "공공데이터·운영자 확인·이용자 제보를 출처와 날짜로 구분",
    "Evidence kept apart",
    "Public data, operator checks and visitor reports are shown separately, with source and date",
  ],
  [
    "빈칸은 질문과 제보로",
    "모르는 항목은 전화 질문이 되고, 다녀온 분의 제보로 채워져요",
    "Blanks become questions",
    "Unknown items turn into questions to ask by phone, and can be filled by visitor reports",
  ],
  [
    "이용자 유형별로",
    "휠체어·고령자·유아 동반 가족, 그리고 외국인 여행자에게 필요한 항목을 골라 보여 줘요",
    "Chosen for who is travelling",
    "Items for wheelchair users, older adults, families with young children and foreign visitors",
  ],
];

const SRC: [string, string, string, string, string][] = [
  ["src-public", "공공데이터", "데이터셋 이름과 기준일을 함께 표시", "Public data", "Shown with the dataset name and reference date"],
  ["src-operator", "운영자 확인", "운영기관에 전화로 확인한 내용과 날짜", "Operator check", "What the operator confirmed by phone, and when"],
  ["src-user", "이용자 제보", "익명 제보와 방문 시기. 신고가 쌓이면 숨김", "Visitor report", "Anonymous reports with visit time; hidden after repeated flags"],
  ["src-web", "온라인 자료 참고", "공지·후기 요약. 항목 상태는 바꾸지 않음", "Online reference", "Summaries of notices and reviews; never changes an item's status"],
  ["src-blank", "빈칸", "결합한 데이터에서 확인하지 못한 항목. 전화 질문으로 연결", "Blank", "Not found in the combined data; turned into a phone question"],
];

export default function AboutView({ lang }: { lang: Lang }) {
  const en = lang === "en";
  const t = (ko: string, e: string) => (en ? e : ko);
  const link = "underline underline-offset-2";
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="eyebrow">{t("소개", "About")}</p>
        <h1 className="text-[1.7rem] font-bold sm:text-3xl">
          {t("휴양림 여행 전에, 확인할 근거를 한곳에", "Check the evidence before your forest trip")}
        </h1>
        {en ? (
          <p className="text-muted">
            &lsquo;Barrier-free facilities&rsquo; alone does not tell you about thresholds, slopes or toilets. Soopnurim{" "}
            <strong className="text-fg">does not rate or judge</strong> recreation forests. It shows what is known and
            what is still blank, as it is.
          </p>
        ) : (
          <p className="text-muted">
            &lsquo;무장애 시설 있음&rsquo;만으로는 문턱·경사·화장실까지 알 수 없어요. 숲누림은 휴양림을{" "}
            <strong className="text-fg">평가하거나 판정하지 않고</strong>, 있는 정보와 빈칸을 그대로 보여 드려요.
          </p>
        )}
      </header>

      <section className="card space-y-3 p-4 sm:p-5">
        <h2 className="text-xl font-bold">{t("무엇이 다른가요?", "What is different?")}</h2>
        <ol className="space-y-3">
          {DIFF.map(([tk, dk, te, de], i) => (
            <li key={tk} className="flex gap-3">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-fill text-sm font-bold text-white">
                {i + 1}
              </span>
              <span>
                <strong className="block font-semibold">{en ? te : tk}</strong>
                <span className="text-muted">{en ? de : dk}</span>
              </span>
            </li>
          ))}
        </ol>
        {en ? (
          <p className="text-sm text-muted">
            Blanks that repeat across the country are collected as{" "}
            <Link href={href(lang, "/gaps")} className={link}>
              data improvement proposals
            </Link>
            . Bookings are made on{" "}
            <a href="https://www.foresttrip.go.kr" target="_blank" rel="noreferrer" className={link}>
              Foresttrip (숲나들e, in Korean)
            </a>
            . For travel help in English, call the Korea Travel Hotline 1330.
          </p>
        ) : (
          <p className="text-sm text-muted">
            전국에서 반복되는 빈칸은{" "}
            <Link href="/gaps" className={link}>
              데이터 개선 제안
            </Link>
            으로 정리했어요. 예약은{" "}
            <a href="https://www.foresttrip.go.kr" target="_blank" rel="noreferrer" className={link}>
              숲나들e
            </a>
            , 휴양림 밖 무장애 관광은{" "}
            <a href="https://access.visitkorea.or.kr" target="_blank" rel="noreferrer" className={link}>
              열린관광 모두의 여행
            </a>
            에서 확인하세요.
          </p>
        )}
      </section>

      <section className="card space-y-3 p-4 sm:p-5">
        <h2 className="text-xl font-bold">{t("정보 표시", "How information is labelled")}</h2>
        <ul className="space-y-2.5">
          {SRC.map(([cls, lk, dk, le, de]) => (
            <li key={cls} className="flex flex-wrap items-baseline gap-x-2">
              <span className={`src ${cls}`}>{en ? le : lk}</span>
              <span>{en ? de : dk}</span>
            </li>
          ))}
        </ul>
        <p className="text-sm text-muted">
          {en ? (
            <>
              <strong className="text-fg">Information coverage</strong> (e.g. 8/15 items) is not an accessibility score.
              It counts how many of the items you need have sourced information. More information does not mean the
              forest is safer or easier to use. Visitor reports are not counted.
            </>
          ) : (
            <>
              <strong className="text-fg">정보 확인도</strong>(예: 8/15항목)는 접근성 점수가 아니라, 필요한 항목 중 출처가
              있는 정보가 몇 개인지 센 것이에요. 정보가 많다고 시설이 더 안전하거나 이용하기 좋다는 뜻은 아니에요.
              이용자 제보는 넣지 않아요.
            </>
          )}
        </p>
      </section>

      <section className="card space-y-2 p-4 sm:p-5">
        <h2 className="flex flex-wrap items-center gap-2 text-xl font-bold">
          {t("사진으로 빈칸 채우기", "Fill blanks with a photo")} <span className="tag">{t("준비 중", "Coming later")}</span>
        </h2>
        <p>
          {en ? (
            <>
              Upload a photo and AI looks for clues such as thresholds, ramps or grab bars, and only{" "}
              <strong>suggests</strong> items to report. It is built but not yet available because of running costs. You
              can see an example on each forest page.
            </>
          ) : (
            <>
              사진을 올리면 AI가 문턱·경사로·손잡이 같은 단서를 찾아 제보할 항목을 <strong>제안만</strong> 하는
              기능이에요. 만들어 두었지만 운영 비용 문제로 아직 쓸 수 없어요. 휴양림 화면에서 예시를 볼 수 있어요.
            </>
          )}
        </p>
        <p className="text-sm text-muted">
          {t(
            "켜면 사진은 위치정보를 지운 뒤 분석을 위해 외부 AI 서비스(Anthropic Claude)로 보내지고, 숲누림 서버에는 저장하지 않아요.",
            "When enabled, photos have location data removed and are sent to an outside AI service (Anthropic Claude) for analysis. They are not stored on Soopnurim's server.",
          )}
        </p>
      </section>

      <p className="text-sm text-muted">
        <Link href={href(lang, "/data")} className={link}>
          {t("데이터 출처", "Data sources")}
        </Link>
        {" · "}
        <Link href={href(lang, "/gaps")} className={link}>
          {t("전국 빈칸", "Nationwide gaps")}
        </Link>
      </p>
    </div>
  );
}
