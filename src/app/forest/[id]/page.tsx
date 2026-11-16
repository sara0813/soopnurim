import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import JourneyView from "@/components/JourneyView";
import { FORESTS, SOURCES, buildJourney, getForest } from "@/lib/journey";

export function generateStaticParams() {
  return FORESTS.map((f) => ({ id: f.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const f = getForest((await params).id);
  return { title: f ? `${f.name} 여정 정보` : "숲 정보" };
}

const km = (d: number) => (d < 0.05 ? "50m 미만" : d < 1 ? `${Math.round(d * 1000)}m` : `${d.toFixed(1)}km`);

export default async function ForestPage({ params }: { params: Promise<{ id: string }> }) {
  const f = getForest((await params).id);
  if (!f) notFound();
  const items = buildJourney(f);

  return (
    <article className="space-y-6">
      <Link href="/" className="inline-block py-2 font-semibold underline">
        ← 숲 목록으로
      </Link>
      <header className="space-y-2">
        <h1 className="text-3xl font-extrabold">{f.name}</h1>
        <p className="text-lg">{f.address}</p>
        <dl className="grid gap-x-6 gap-y-1 text-base sm:grid-cols-2">
          <div className="flex gap-2">
            <dt className="font-bold">운영</dt>
            <dd>
              {f.institution || "-"} ({f.ownership})
            </dd>
          </div>
          <div className="flex gap-2">
            <dt className="font-bold">전화</dt>
            <dd>{f.tel ? <a href={`tel:${f.tel.replace(/[^0-9+]/g, "")}`} className="underline">{f.tel}</a> : "정보 없음"}</dd>
          </div>
          {f.homepage && (
            <div className="flex gap-2 sm:col-span-2">
              <dt className="font-bold">홈페이지</dt>
              <dd className="break-all">
                <a href={f.homepage.startsWith("http") ? f.homepage : `https://${f.homepage}`} target="_blank" rel="noreferrer" className="underline">
                  {f.homepage}
                </a>
              </dd>
            </div>
          )}
          {f.facilities.length > 0 && (
            <div className="flex gap-2 sm:col-span-2">
              <dt className="shrink-0 font-bold">주요시설</dt>
              <dd>{f.facilities.join(", ")}</dd>
            </div>
          )}
        </dl>
        {f.notInStd && (
          <p className="rounded-xl bg-[var(--warn-bg)] p-3 text-[var(--warn)]">
            이 국립자연휴양림은 <strong>전국휴양림표준데이터에 없어</strong> 국립자연휴양림관리소 시설정보 데이터로 보완해 표시합니다.
          </p>
        )}
      </header>

      <JourneyView items={items} tel={f.tel} forestName={f.name} />

      {f.nanum.length > 0 && (
        <section aria-labelledby="nanum-h" className="card p-4">
          <h2 id="nanum-h" className="mb-2 text-xl font-extrabold">
            근처 무장애나눔길 <span className="text-base font-normal text-muted">(좌표 직선거리 3km 이내)</span>
          </h2>
          <ul className="space-y-2">
            {f.nanum.map((n) => (
              <li key={n.name}>
                <strong>{n.name}</strong> · 직선 {km(n.distKm)}
                {n.lengthM ? ` · 길이 ${n.lengthM.toLocaleString()}m` : ""} · {n.year}년 조성 · 관리 {n.org}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-sm text-muted">
            무장애나눔길 데이터와 휴양림 데이터에는 공통 ID가 없어 좌표로 연결했습니다. 경사·노면·폭 정보는 원본 데이터에 없습니다.
          </p>
        </section>
      )}

      {f.survey && (
        <section aria-labelledby="survey-h" className="card p-4">
          <h2 id="survey-h" className="mb-2 text-xl font-extrabold">
            현장조사 기록 <span className="text-base font-normal text-muted">제주특별자치도 무장애여행정보 · 기준일 {f.survey.refDate}</span>
          </h2>
          <ul className="space-y-1">
            {f.survey.points.map((p, i) => (
              <li key={i}>
                <strong>{p.place}</strong>
                {p.detail && ` – ${p.detail}`}
                {p.info && <span className="text-muted"> ({p.info})</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="src-h" className="text-sm text-muted">
        <h2 id="src-h" className="mb-1 font-bold">이 페이지의 데이터 출처</h2>
        <ul className="list-disc pl-5">
          {f.sources.map((s) => (
            <li key={s}>
              <a href={SOURCES[s].url} target="_blank" rel="noreferrer" className="underline">
                {SOURCES[s].name}
              </a>{" "}
              ({SOURCES[s].org}) · 기준일 {s === "std" ? f.refDate : s === "jeju" ? f.survey?.refDate : SOURCES[s].refDate}
            </li>
          ))}
        </ul>
        {f.duplicates && (
          <p className="mt-2">
            ※ 표준데이터에 같은 휴양림이 {f.duplicates.length + 1}건 등록되어 있어 기준일이 가장 최신인 레코드를 사용했습니다.
          </p>
        )}
      </section>
    </article>
  );
}
