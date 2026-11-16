import type { Metadata } from "next";
import { SOURCES } from "@/lib/journey";

export const metadata: Metadata = { title: "소개와 데이터 출처" };

export default function About() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-extrabold">숲누림 소개</h1>
      <section className="card space-y-2 p-4">
        <h2 className="text-xl font-extrabold">왜 만들었나요?</h2>
        <p>
          휴양림에 무장애 시설이 &lsquo;있다&rsquo;고 표시돼도, 휠체어 이용자·고령자·유아 동반 가족이 도착부터 숲길까지 여정 전체를
          해낼 수 있는지는 알기 어렵습니다. 공공데이터에는 시설이 있는지만 나오고 문턱·경사·화장실 규격 같은 정보는 비어
          있어, 결국 전화로 일일이 묻거나 현장에서 실패하게 됩니다.
        </p>
        <p>
          숲누림은 휴양림을 <strong>평가하지 않습니다.</strong> 산림공공데이터와 확인 정보를 연결해 여행 전에 직접 판단할 근거와,
          비어 있는 정보를 채울 질문 목록을 드립니다.
        </p>
      </section>

      <section className="card space-y-2 p-4">
        <h2 className="text-xl font-extrabold">정보 확인도란?</h2>
        <p>
          선택한 이용자 유형에 필요한 확인 항목 중, 출처가 있는 정보로 채워진 항목의 비율입니다.{" "}
          <strong>접근성 점수가 아닙니다.</strong> 확인도가 높아도 &lsquo;주의&rsquo;나 &lsquo;없음&rsquo; 항목이 있을 수 있고, 낮다고 이용이
          어렵다는 뜻도 아닙니다.
        </p>
      </section>

      <section className="card space-y-2 p-4">
        <h2 className="text-xl font-extrabold">정보 표시 방법</h2>
        <ul className="space-y-2">
          <li>
            <span className="badge src-public">공공데이터</span> 산림청 및 산하기관 공공데이터 (데이터셋명·기준일 표기)
          </li>
          <li>
            <span className="badge src-operator">운영자 확인</span> 숲누림이 운영기관에 직접 전화로 확인 (확인 날짜 표기)
          </li>
          <li>
            <span className="badge src-user">이용자 제보</span> 방문자 익명 제보 (방문 시기 표기, 준비 중)
          </li>
          <li>
            <span className="badge src-blank">⚪ 빈칸</span> 정보 없음 → 전화 질문 목록으로 연결
          </li>
        </ul>
      </section>

      <section className="card space-y-2 p-4">
        <h2 className="text-xl font-extrabold">사용한 산림공공데이터</h2>
        <ul className="list-disc space-y-1 pl-5">
          {Object.entries(SOURCES).map(([k, s]) => (
            <li key={k}>
              <a href={s.url} target="_blank" rel="noreferrer" className="font-semibold underline">
                {s.name}
              </a>{" "}
              – {s.org}
              {s.refDate ? ` · 기준일 ${s.refDate}` : " · 레코드별 데이터기준일자 표기"} · 이용허락범위 제한 없음
            </li>
          ))}
        </ul>
        <p className="text-sm text-muted">
          가공: 표준데이터 중복 레코드 정리, 데이터셋 간 공통 ID가 없어 이름·좌표 거리로 매칭, 주요시설명·객실 설명 텍스트에서
          키워드 추출. 지도: © OpenStreetMap contributors.
        </p>
      </section>
    </div>
  );
}
