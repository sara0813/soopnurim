"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo, useState } from "react";
import CoverageBar from "./CoverageBar";
import GroupPicker from "./GroupPicker";
import { coverage } from "@/lib/coverage";
import { groupsMask } from "@/lib/groups";
import { useGroups } from "@/lib/useGroups";
import type { ForestSummary } from "@/lib/types";

const ForestMap = dynamic(() => import("./ForestMap"), {
  ssr: false,
  loading: () => <p className="p-6 text-center">지도를 불러오는 중…</p>,
});

export interface NanumPoint {
  name: string;
  lat: number;
  lng: number;
  lengthM: number | null;
  year: string;
  org: string;
}

const km = (d: number) => (d < 0.05 ? "50m 미만" : d < 1 ? `${Math.round(d * 1000)}m` : `${d.toFixed(1)}km`);
const PAGE = 24;

export default function Explorer({ forests, nanum }: { forests: ForestSummary[]; nanum: NanumPoint[] }) {
  const { groups } = useGroups();
  const mask = groupsMask(groups);
  const [view, setView] = useState<"list" | "map">("list");
  const [q, setQ] = useState("");
  const [sido, setSido] = useState("");
  const [stayOnly, setStayOnly] = useState(false);
  const [trailOnly, setTrailOnly] = useState(false);
  const [sort, setSort] = useState<"coverage" | "name">("coverage");
  const [limit, setLimit] = useState(PAGE);

  const sidos = useMemo(() => [...new Set(forests.map((f) => f.sido).filter(Boolean))].sort(), [forests]);

  const rows = useMemo(() => {
    const kw = q.trim().replace(/\s/g, "");
    const out = forests
      .filter((f) => !kw || (f.name + f.address).replace(/\s/g, "").includes(kw))
      .filter((f) => !sido || f.sido === sido)
      .filter((f) => !stayOnly || f.stay)
      .filter((f) => !trailOnly || (f.nanumNearest && f.nanumNearest.distKm <= 3))
      .map((f) => ({ f, cov: coverage(f.items, mask) }));
    out.sort((a, b) =>
      sort === "name"
        ? a.f.name.localeCompare(b.f.name, "ko")
        : b.cov.known / b.cov.total - a.cov.known / a.cov.total || a.f.name.localeCompare(b.f.name, "ko"),
    );
    return out;
  }, [forests, q, sido, stayOnly, trailOnly, sort, mask]);

  return (
    <div className="space-y-5">
      <section aria-labelledby="intro" className="space-y-2">
        <h1 id="intro" className="text-2xl font-extrabold leading-snug sm:text-3xl">
          이 숲, 우리 가족이 갈 수 있을까?
          <br />
          <span className="text-brand-strong">판단에 필요한 정보와 빈칸</span>을 먼저 확인하세요.
        </h1>
        <p className="text-muted">
          전국 자연휴양림 {forests.length}곳을 산림공공데이터 4종으로 연결했습니다. 숲누림은 &lsquo;이용 가능&rsquo;을
          판정하지 않고, 항목별로 <strong>무엇이 확인됐고 무엇이 비어 있는지</strong>를 출처와 함께 보여줍니다.
        </p>
      </section>

      <div className="card p-4">
        <GroupPicker />
      </div>

      <section aria-label="검색과 필터" className="card space-y-3 p-4">
        <div className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr]">
          <label className="flex flex-col gap-1">
            <span className="font-bold">숲 이름·주소 검색</span>
            <input
              type="search"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setLimit(PAGE);
              }}
              placeholder="예: 유명산, 양평"
              className="min-h-12 rounded-xl border-2 border-line bg-surface px-3"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-bold">지역</span>
            <select
              value={sido}
              onChange={(e) => {
                setSido(e.target.value);
                setLimit(PAGE);
              }}
              className="min-h-12 rounded-xl border-2 border-line bg-surface px-3"
            >
              <option value="">전체</option>
              {sidos.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-bold">정렬</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as "coverage" | "name")}
              className="min-h-12 rounded-xl border-2 border-line bg-surface px-3"
            >
              <option value="coverage">정보 확인도 높은 순</option>
              <option value="name">이름순</option>
            </select>
          </label>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <label className="flex min-h-12 items-center gap-2">
            <input type="checkbox" className="size-6" checked={stayOnly} onChange={(e) => setStayOnly(e.target.checked)} />
            숙박 가능한 곳만
          </label>
          <label className="flex min-h-12 items-center gap-2">
            <input
              type="checkbox"
              className="size-6"
              checked={trailOnly}
              onChange={(e) => setTrailOnly(e.target.checked)}
            />
            무장애나눔길이 3km 안에 있는 곳만
          </label>
        </div>
      </section>

      <div className="flex items-center justify-between gap-2">
        <p aria-live="polite" className="font-bold">
          {rows.length}곳
        </p>
        <div role="tablist" aria-label="보기 방식" className="flex gap-2">
          {(["list", "map"] as const).map((v) => (
            <button
              key={v}
              role="tab"
              aria-selected={view === v}
              onClick={() => setView(v)}
              className="btn btn-outline"
            >
              {v === "list" ? "📋 목록" : "🗺️ 지도"}
            </button>
          ))}
        </div>
      </div>

      {view === "map" ? (
        <div className="card overflow-hidden">
          <ForestMap forests={rows.map((r) => r.f)} nanum={nanum} />
          <p className="flex flex-wrap gap-4 p-3 text-sm">
            <span>
              <span aria-hidden="true" className="mr-1 inline-block size-3 rounded-full bg-[#1f6b45]" />
              자연휴양림
            </span>
            <span>
              <span aria-hidden="true" className="mr-1 inline-block size-3 rounded-full bg-[#e07b00]" />
              무장애나눔길
            </span>
            <span>
              <span aria-hidden="true" className="mr-1 inline-block h-0.5 w-5 bg-[#e07b00] align-middle" />
              3km 이내 연결(좌표 매칭)
            </span>
          </p>
        </div>
      ) : (
        <>
          <ul className="grid gap-3 sm:grid-cols-2">
            {rows.slice(0, limit).map(({ f, cov }) => (
              <li key={f.id}>
                <article className="card flex h-full flex-col gap-2 p-4">
                  <h2 className="text-xl font-extrabold">
                    <Link href={`/forest/${f.id}`} className="underline-offset-4 hover:underline">
                      {f.name}
                    </Link>
                  </h2>
                  <p className="text-sm text-muted">{f.address || f.sido}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {f.stay === true && <span className="badge src-public">🏠 숙박 가능</span>}
                    {f.stay === false && <span className="badge src-blank">당일 방문</span>}
                    {f.nanumNearest && f.nanumNearest.distKm <= 0.5 && (
                      <span className="badge src-public">♿ 무장애나눔길 연결</span>
                    )}
                    {f.nanumNearest && f.nanumNearest.distKm > 0.5 && (
                      <span className="badge st-warn">무장애나눔길 {km(f.nanumNearest.distKm)}</span>
                    )}
                    {f.national && <span className="badge src-public">국립휴양림 객실정보</span>}
                    {f.survey && <span className="badge src-public">현장조사 자료</span>}
                  </div>
                  <div className="mt-auto pt-2">
                    <CoverageBar known={cov.known} total={cov.total} />
                  </div>
                  <p className="text-xs text-muted">
                    출처: {f.sourceNames.join(" · ")} | 기준일 {f.refDate}
                  </p>
                  <Link href={`/forest/${f.id}`} className="btn btn-primary mt-1">
                    여정별 정보·빈칸 보기 <span aria-hidden="true">→</span>
                  </Link>
                </article>
              </li>
            ))}
          </ul>
          {rows.length > limit && (
            <div className="text-center">
              <button className="btn btn-outline" onClick={() => setLimit((l) => l + PAGE)}>
                더 보기 ({rows.length - limit}곳 남음)
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
