import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "소개" };

export default function About() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="eyebrow">소개</p>
        <h1 className="text-[1.7rem] font-bold sm:text-3xl">산림여행 한 번을, 확인할 근거로 잇습니다</h1>
        <p className="max-w-2xl text-muted">
          숲누림은 산림공공데이터와 현장 확인 정보를 연결해, 휴양림 도착부터 숙박·화장실·숲길까지 이용자가 직접 판단할 근거를
          제공하는 서비스입니다.
        </p>
      </header>

      <section className="card space-y-3 p-4 sm:p-5">
        <h2 className="text-xl font-bold">왜 만들었나요?</h2>
        <p>
          휴양림에 무장애 시설이 &lsquo;있다&rsquo;고 표시돼도, 휠체어 이용자·고령자·유아 동반 가족이 도착부터 숲길까지 여정 전체를
          해낼 수 있는지는 알기 어렵습니다. 공공데이터에는 시설이 있는지 정도만 나오고 문턱·경사·화장실 규격 같은 정보는 비어
          있어, 결국 전화로 일일이 묻거나 현장에서 곤란을 겪게 됩니다.
        </p>
        <p>
          숲누림은 휴양림을 <strong>평가하거나 판정하지 않습니다.</strong> 확인된 정보와 빈칸을 출처와 함께 보여드리고, 빈칸은
          물어볼 질문과 다녀온 분의 제보로 채워 갑니다.
        </p>
      </section>

      <section className="card space-y-3 p-4 sm:p-5">
        <h2 className="text-xl font-bold">기존 서비스와 무엇이 다른가요?</h2>
        <p className="text-muted">
          무장애 관광정보, 무장애나눔길 지도, 휴양림 예약, 사진 기반 접근성 제보는 이미 좋은 서비스가 있습니다. 숲누림은 이들을
          대신하지 않고, 흩어진 정보를 산림여행 한 건의 여정으로 잇는 데 집중합니다.
        </p>
        <ol className="space-y-3">
          {[
            [
              "산림여행 전 과정을 연결",
              "관광지 목록이나 숲길 지도에서 끝나지 않고, 주차 → 진입로 → 객실 → 화장실 → 숲길 → 안전을 한 화면에서 이어 봅니다.",
            ],
            [
              "정보의 근거를 구분해 표시",
              "공공데이터, 운영자 확인, 이용자 제보, 온라인 자료 참고를 서로 섞지 않고, 출처와 확인 시점을 항목마다 붙입니다.",
            ],
            [
              "빈칸을 질문과 제보로 채우기",
              "데이터에 없는 항목은 전화 질문 목록으로 바꾸고, 다녀온 분이 있었어요·없었어요와 방문 시기를 남길 수 있습니다.",
            ],
          ].map(([t, d], i) => (
            <li key={t} className="flex gap-3">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-strong text-sm font-bold text-white">
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
          예약은{" "}
          <a href="https://www.foresttrip.go.kr" target="_blank" rel="noreferrer" className="underline underline-offset-2">
            숲나들e
          </a>
          , 휴양림 밖 관광지의 무장애 정보는{" "}
          <a href="https://access.visitkorea.or.kr" target="_blank" rel="noreferrer" className="underline underline-offset-2">
            열린관광 모두의 여행
          </a>
          에서 함께 확인하세요.
        </p>
      </section>

      <section className="card space-y-3 p-4 sm:p-5">
        <h2 className="text-xl font-bold">정보 표시 방법</h2>
        <ul className="space-y-2.5">
          <li className="flex flex-wrap items-baseline gap-x-2">
            <span className="src src-public">공공데이터</span>
            <span>산림청 및 관계기관 공공데이터. 데이터셋 이름과 기준일을 함께 적습니다.</span>
          </li>
          <li className="flex flex-wrap items-baseline gap-x-2">
            <span className="src src-operator">운영자 확인</span>
            <span>숲누림이 운영기관에 직접 전화로 확인한 내용. 확인 날짜를 적습니다.</span>
          </li>
          <li className="flex flex-wrap items-baseline gap-x-2">
            <span className="src src-user">이용자 제보</span>
            <span>다녀온 분의 익명 제보. 방문 시기를 적고, 신고가 쌓이면 숨겨집니다.</span>
          </li>
          <li className="flex flex-wrap items-baseline gap-x-2">
            <span className="src src-web">온라인 자료 참고</span>
            <span>운영기관 공지나 방문 후기를 요약한 참고 정보. &lsquo;미확인&rsquo;으로 표시하며 항목 상태를 바꾸지 않습니다.</span>
          </li>
          <li className="flex flex-wrap items-baseline gap-x-2">
            <span className="src src-blank">빈칸</span>
            <span>어느 출처에도 정보가 없는 항목. 전화 질문 목록으로 연결합니다.</span>
          </li>
        </ul>
      </section>

      <section className="card space-y-2 p-4 sm:p-5">
        <h2 className="text-xl font-bold">정보 확인도란?</h2>
        <p>
          선택한 이용자 유형에 필요한 확인 항목 중, 출처가 있는 정보로 채워진 항목의 비율입니다.{" "}
          <strong>접근성 점수가 아닙니다.</strong> 확인도가 높아도 &lsquo;추가 확인 필요&rsquo;나 &lsquo;없음&rsquo; 항목이 있을 수
          있고, 낮다고 이용이 어렵다는 뜻도 아닙니다. 이용자 제보는 확인도에 넣지 않고 따로 보여드립니다.
        </p>
      </section>

      <section className="card space-y-2 p-4 sm:p-5">
        <h2 className="text-xl font-bold">숲누림 렌즈 (AI 보조 제보)</h2>
        <p>
          휴양림 상세 페이지의 &lsquo;사진으로 빈칸 채우기&rsquo;에서 다녀온 곳 사진을 올리면, AI가 사진 속 단서(문턱, 경사로,
          손잡이 등)를 찾아 어떤 항목에 제보할지 <strong>제안만</strong> 합니다. 제보로 남는 것은 이용자가 직접 고르고 확인한
          항목뿐이며, 이 제보에는 &lsquo;사진 보고 확인&rsquo;이 함께 표시됩니다.
        </p>
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted">
          <li>사진은 올리기 전에 브라우저에서 크기를 줄이고 위치정보(EXIF)를 지웁니다.</li>
          <li>사진은 분석에만 쓰고 숲누림에 저장하지 않습니다. 분석에는 Anthropic의 Claude를 사용합니다.</li>
          <li>AI는 판정을 하지 않고 사진에 보이는 사실만 제안하며, 얼굴·차량번호 같은 개인정보는 적지 않도록 했습니다.</li>
        </ul>
      </section>

      <p className="text-sm text-muted">
        사용한 데이터셋과 가공 방법은{" "}
        <Link href="/data" className="underline underline-offset-2">
          데이터 출처
        </Link>
        에, 데이터에서 발견한 빈칸과 개선 제안은{" "}
        <Link href="/gaps" className="underline underline-offset-2">
          전국 빈칸
        </Link>
        에 정리했습니다.
      </p>
    </div>
  );
}
