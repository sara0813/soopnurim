import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "소개" };

const DIFF = [
  ["여정 전체를 한 화면에", "주차 → 진입로 → 객실 → 화장실 → 숲길 → 안전"],
  ["근거를 섞지 않고 표시", "공공데이터·운영자 확인·이용자 제보를 출처와 날짜로 구분"],
  ["빈칸은 질문과 제보로", "모르는 항목은 전화 질문이 되고, 다녀온 분의 제보로 채워져요"],
];

export default function About() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="eyebrow">소개</p>
        <h1 className="text-[1.7rem] font-bold sm:text-3xl">휴양림 여행 전에, 확인할 근거를 한곳에</h1>
        <p className="text-muted">
          &lsquo;무장애 시설 있음&rsquo;만으로는 문턱·경사·화장실까지 알 수 없어요. 숲누림은 휴양림을{" "}
          <strong className="text-fg">평가하거나 판정하지 않고</strong>, 있는 정보와 빈칸을 그대로 보여 드려요.
        </p>
      </header>

      <section className="card space-y-3 p-4 sm:p-5">
        <h2 className="text-xl font-bold">무엇이 다른가요?</h2>
        <ol className="space-y-3">
          {DIFF.map(([t, d], i) => (
            <li key={t} className="flex gap-3">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-fill text-sm font-bold text-white">
                {i + 1}
              </span>
              <span>
                <strong className="block font-semibold">{t}</strong>
                <span className="text-muted">{d}</span>
              </span>
            </li>
          ))}
        </ol>
        <p className="text-sm text-muted">
          전국에서 반복되는 빈칸은{" "}
          <Link href="/gaps" className="underline underline-offset-2">
            데이터 개선 제안
          </Link>
          으로 정리했어요. 예약은{" "}
          <a href="https://www.foresttrip.go.kr" target="_blank" rel="noreferrer" className="underline underline-offset-2">
            숲나들e
          </a>
          , 휴양림 밖 무장애 관광은{" "}
          <a href="https://access.visitkorea.or.kr" target="_blank" rel="noreferrer" className="underline underline-offset-2">
            열린관광 모두의 여행
          </a>
          에서 확인하세요.
        </p>
      </section>

      <section className="card space-y-3 p-4 sm:p-5">
        <h2 className="text-xl font-bold">정보 표시</h2>
        <ul className="space-y-2.5">
          {[
            ["src-public", "공공데이터", "데이터셋 이름과 기준일을 함께 표시"],
            ["src-operator", "운영자 확인", "운영기관에 전화로 확인한 내용과 날짜"],
            ["src-user", "이용자 제보", "익명 제보와 방문 시기. 신고가 쌓이면 숨김"],
            ["src-web", "온라인 자료 참고", "공지·후기 요약. 항목 상태는 바꾸지 않음"],
            ["src-blank", "빈칸", "어디에도 정보가 없는 항목. 전화 질문으로 연결"],
          ].map(([cls, label, d]) => (
            <li key={label} className="flex flex-wrap items-baseline gap-x-2">
              <span className={`src ${cls}`}>{label}</span>
              <span>{d}</span>
            </li>
          ))}
        </ul>
        <p className="text-sm text-muted">
          <strong className="text-fg">정보 확인도</strong>는 접근성 점수가 아니라, 필요한 항목 중 출처가 있는 정보의
          비율이에요. 이용자 제보는 넣지 않아요.
        </p>
      </section>

      <section className="card space-y-2 p-4 sm:p-5">
        <h2 className="flex flex-wrap items-center gap-2 text-xl font-bold">
          사진으로 빈칸 채우기 <span className="tag">준비 중</span>
        </h2>
        <p>
          사진을 올리면 AI가 문턱·경사로·손잡이 같은 단서를 찾아 제보할 항목을 <strong>제안만</strong> 하는 기능이에요.
          만들어 두었지만 운영 비용 문제로 아직 쓸 수 없어요. 휴양림 화면에서 예시를 볼 수 있어요.
        </p>
        <p className="text-sm text-muted">사진은 위치정보를 지우고 분석에만 쓰며 저장하지 않아요.</p>
      </section>

      <p className="text-sm text-muted">
        <Link href="/data" className="underline underline-offset-2">
          데이터 출처
        </Link>
        {" · "}
        <Link href="/gaps" className="underline underline-offset-2">
          전국 빈칸
        </Link>
      </p>
    </div>
  );
}
