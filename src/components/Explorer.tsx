"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Accessibility,
  ArrowRight,
  Baby,
  BedDouble,
  CalendarCheck,
  ChevronDown,
  List,
  LocateFixed,
  Map as MapIcon,
  Percent,
  Phone,
  Route,
  Search,
  SlidersHorizontal,
  Ticket,
  Toilet,
  Users,
  X,
} from "lucide-react";
import CoverageBar from "./CoverageBar";
import GroupPicker from "./GroupPicker";
import type { MapLayers } from "./ForestMap";
import { bookingLink } from "@/lib/booking";
import { coverage } from "@/lib/coverage";
import { groupsMask } from "@/lib/groups";
import { useGroups } from "@/lib/useGroups";
import type { ForestSummary, NanumPoint, ToiletPoint } from "@/lib/types";

const ForestMap = dynamic(() => import("./ForestMap"), {
  ssr: false,
  loading: () => <p className="p-6 text-center text-muted">지도를 불러오는 중…</p>,
});

const km = (d: number) => (d < 0.05 ? "50m 미만" : d < 1 ? `${Math.round(d * 1000)}m` : `${d.toFixed(1)}km`);
const PAGE = 24;
const STATE_KEY = "soopnurim.explorer";

const CHIPS = [
  { id: "stay", label: "숙박 가능", test: (f: ForestSummary) => f.stay === true },
  { id: "disabledRoom", label: "장애인 추첨·우선예약 객실", test: (f: ForestSummary) => f.disabledLotteryRooms > 0 },
  { id: "discount", label: "장애인 할인", test: (f: ForestSummary) => f.discount },
  { id: "disabledToilet", label: "1.5km 안 장애인 화장실", test: (f: ForestSummary) => !!f.nearestDisabledToilet },
  { id: "nanum", label: "무장애나눔길 3km 안", test: (f: ForestSummary) => !!f.nanumNearest },
  { id: "kids", label: "유아숲체험원", test: (f: ForestSummary) => f.kidsForest },
  { id: "multiChild", label: "다자녀 추첨 객실", test: (f: ForestSummary) => f.multiChildLotteryRooms > 0 },
  { id: "national", label: "국립", test: (f: ForestSummary) => f.ownership === "국유림" },
  { id: "open", label: "휴장 제외", test: (f: ForestSummary) => !f.closed },
] as const;
type ChipId = (typeof CHIPS)[number]["id"];

type Sort = "name" | "distance" | "coverage" | "region";
interface UiState {
  q: string;
  sido: string;
  sgg: string;
  sort: Sort;
  chips: ChipId[];
  view: "list" | "map";
}
const DEFAULT: UiState = { q: "", sido: "", sgg: "", sort: "name", chips: ["open"], view: "list" };

function hav(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const p = Math.PI / 180;
  const x =
    Math.sin(((b.lat - a.lat) * p) / 2) ** 2 +
    Math.cos(a.lat * p) * Math.cos(b.lat * p) * Math.sin(((b.lng - a.lng) * p) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(x));
}

export default function Explorer({
  forests,
  nanum,
  toilets,
  datasetCount,
  forestDatasetCount,
}: {
  forests: ForestSummary[];
  nanum: NanumPoint[];
  toilets: ToiletPoint[];
  datasetCount: number;
  forestDatasetCount: number;
}) {
  const { groups } = useGroups();
  const mask = groupsMask(groups);
  const [st, setSt] = useState<UiState>(DEFAULT);
  const [limit, setLimit] = useState(PAGE);
  const [myLoc, setMyLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [locMsg, setLocMsg] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [layers, setLayers] = useState<MapLayers>({ nanum: true, toilet: false });
  const [panelOpen, setPanelOpen] = useState(false);

  // 상세 페이지에서 돌아왔을 때 검색 조건 유지 (이 브라우저에만 저장)
  useEffect(() => {
    try {
      const s = sessionStorage.getItem(STATE_KEY);
      if (s) {
        const saved = JSON.parse(s) as Partial<UiState>;
        // 위치는 저장하지 않으므로 거리순은 이름순으로 되돌린다
        setSt({ ...DEFAULT, ...saved, sort: saved.sort === "distance" ? "name" : (saved.sort ?? "name") });
      }
    } catch {
      /* 저장소 사용 불가 */
    }
  }, []);
  const update = (patch: Partial<UiState>) => {
    setSt((s) => {
      const n = { ...s, ...patch };
      try {
        sessionStorage.setItem(STATE_KEY, JSON.stringify(n));
      } catch {
        /* 무시 */
      }
      return n;
    });
    setLimit(PAGE);
  };

  const sidos = useMemo(() => [...new Set(forests.map((f) => f.sido).filter(Boolean))].sort(), [forests]);
  const sggs = useMemo(
    () => [...new Set(forests.filter((f) => f.sido === st.sido).map((f) => f.sigungu).filter(Boolean))].sort(),
    [forests, st.sido],
  );

  const rows = useMemo(() => {
    const kw = st.q.trim().replace(/\s/g, "");
    const active = CHIPS.filter((c) => st.chips.includes(c.id));
    const out = forests
      .filter((f) => !kw || (f.name + f.address + f.sido + f.sigungu).replace(/\s/g, "").includes(kw))
      .filter((f) => !st.sido || f.sido === st.sido)
      .filter((f) => !st.sgg || f.sigungu === st.sgg)
      .filter((f) => active.every((c) => c.test(f)))
      .map((f) => ({
        f,
        cov: coverage(f.items, mask),
        dist: myLoc && f.lat != null && f.lng != null ? hav(myLoc, { lat: f.lat, lng: f.lng }) : null,
      }));
    const byName = (a: (typeof out)[0], b: (typeof out)[0]) => a.f.name.localeCompare(b.f.name, "ko");
    out.sort((a, b) => {
      if (st.sort === "distance" && a.dist != null && b.dist != null) return a.dist - b.dist;
      if (st.sort === "coverage") return b.cov.known / b.cov.total - a.cov.known / a.cov.total || byName(a, b);
      if (st.sort === "region")
        return (a.f.sido + a.f.sigungu).localeCompare(b.f.sido + b.f.sigungu, "ko") || byName(a, b);
      return byName(a, b);
    });
    return out;
  }, [forests, st, mask, myLoc]);

  const locate = () => {
    if (!("geolocation" in navigator)) {
      setLocMsg("이 브라우저는 위치 기능을 지원하지 않습니다.");
      return;
    }
    setLocMsg("위치를 찾는 중…");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setMyLoc({ lat: p.coords.latitude, lng: p.coords.longitude });
        setLocMsg("내 위치에서 가까운 순으로 정렬했습니다. 위치는 이 기기 안에서만 쓰이고 저장·전송하지 않습니다.");
        update({ sort: "distance" });
      },
      () => setLocMsg("위치를 가져오지 못했습니다. 브라우저의 위치 권한을 확인해 주세요."),
      { enableHighAccuracy: false, timeout: 10000 },
    );
  };

  const selected = rows.find((r) => r.f.id === selectedId) ?? null;
  const activeCount = (st.sido ? 1 : 0) + st.chips.filter((c) => c !== "open").length + (st.sort !== "name" ? 1 : 0);
  const filtered = st.q || st.sido || st.chips.length > 1 || (st.chips.length === 1 && st.chips[0] !== "open");

  return (
    <div className="space-y-5">
      <section aria-labelledby="intro" className="space-y-3 pt-1">
        <p className="eyebrow">
          산림공공데이터 {forestDatasetCount}종 포함 공공데이터 {datasetCount}종 · 휴양림 {forests.length}곳
        </p>
        <h1 id="intro" className="text-[1.6rem] font-bold leading-snug sm:text-[2rem]">
          휴양림 여행, 가기 전에 확인할 정보를
          <br className="hidden sm:block" /> 한 곳에서 보세요
        </h1>
        <p className="max-w-2xl text-muted">
          주차부터 진입로·숙소·화장실·숲길·안전까지, 흩어진 공공데이터를 여행 순서대로 이었습니다. 정보마다 출처와 기준일을
          붙이고, 데이터에 없는 빈칸은 운영기관에 물어볼 질문으로 바꿔 드립니다.
        </p>
        <ol className="grid gap-2 pt-1 text-sm sm:grid-cols-3">
          {[
            ["여정 단위로 연결", "도착 → 진입로 → 숙소 → 화장실 → 숲길 → 안전"],
            ["출처와 기준일 표시", "공공데이터·운영자 확인·이용자 제보를 구분"],
            ["빈칸은 질문과 제보로", "전화 질문 목록과 다녀온 분의 제보"],
          ].map(([t, d], i) => (
            <li key={t} className="flex gap-3 rounded-xl border border-line bg-surface px-3.5 py-3">
              <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-bold text-brand-strong">
                {i + 1}
              </span>
              <span>
                <strong className="block font-semibold">{t}</strong>
                <span className="text-muted">{d}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>

      <div className="card p-4">
        <GroupPicker compact />
      </div>

      {/* 검색·필터: 검색줄만 위에 고정, 상세 조건은 펼쳐서 */}
      <section
        aria-label="검색과 필터"
        className="card sticky top-0 z-[1100] space-y-3 p-3 shadow-[0_4px_16px_rgb(16_40_28/0.06)]"
      >
        <div className="flex gap-2">
          <label className="relative flex-1">
            <span className="sr-only">숲 이름·지역 검색</span>
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted"
            />
            <input
              type="search"
              value={st.q}
              onChange={(e) => update({ q: e.target.value })}
              placeholder="숲 이름이나 지역 (예: 유명산, 가평)"
              className="field pl-9"
            />
          </label>
          <button
            type="button"
            className="btn btn-outline px-3 sm:hidden"
            aria-expanded={panelOpen}
            aria-controls="filter-panel"
            onClick={() => setPanelOpen((o) => !o)}
          >
            <SlidersHorizontal aria-hidden="true" className="size-4" />
            필터{activeCount ? ` ${activeCount}` : ""}
            <ChevronDown aria-hidden="true" className={`size-4 transition-transform ${panelOpen ? "rotate-180" : ""}`} />
          </button>
        </div>
        <div id="filter-panel" className={`${panelOpen ? "block" : "hidden"} space-y-3 sm:block`}>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <label className="flex flex-col gap-1">
              <span className="label">시·도</span>
              <select value={st.sido} onChange={(e) => update({ sido: e.target.value, sgg: "" })} className="field">
                <option value="">전국</option>
                {sidos.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="label">시·군·구</span>
              <select
                value={st.sgg}
                onChange={(e) => update({ sgg: e.target.value })}
                className="field disabled:opacity-50"
                disabled={!st.sido}
              >
                <option value="">{st.sido ? "전체" : "시·도 먼저 선택"}</option>
                {sggs.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <label className="col-span-2 flex flex-col gap-1 sm:col-span-1">
              <span className="label">정렬</span>
              <select value={st.sort} onChange={(e) => update({ sort: e.target.value as Sort })} className="field">
                <option value="name">이름순</option>
                <option value="region">지역순</option>
                <option value="coverage">정보 확인도 높은 순</option>
                <option value="distance" disabled={!myLoc}>
                  내 위치에서 가까운 순{myLoc ? "" : " (내 위치 필요)"}
                </option>
              </select>
            </label>
          </div>
          <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible" role="group" aria-label="조건 필터">
            <button type="button" className="chip" aria-pressed={!!myLoc} onClick={locate}>
              <LocateFixed aria-hidden="true" className="size-4" /> 내 위치
            </button>
            {CHIPS.map((c) => {
              const on = st.chips.includes(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  aria-pressed={on}
                  className="chip"
                  onClick={() => update({ chips: on ? st.chips.filter((x) => x !== c.id) : [...st.chips, c.id] })}
                >
                  {c.label}
                </button>
              );
            })}
          </div>
          {locMsg && (
            <p role="status" className="text-sm text-muted">
              {locMsg}
            </p>
          )}
        </div>
        <div className="flex items-center justify-between gap-2">
          <p aria-live="polite" className="text-sm font-semibold">
            <span className="text-base font-bold tabular-nums">{rows.length}</span>곳
            {filtered && (
              <button
                type="button"
                className="ml-2 text-sm font-medium text-muted underline underline-offset-2"
                onClick={() => update({ ...DEFAULT, view: st.view })}
              >
                조건 초기화
              </button>
            )}
          </p>
          <div role="tablist" aria-label="보기 방식" className="seg">
            {(["list", "map"] as const).map((v) => (
              <button key={v} type="button" role="tab" aria-selected={st.view === v} onClick={() => update({ view: v })}>
                {v === "list" ? <List aria-hidden="true" className="size-4" /> : <MapIcon aria-hidden="true" className="size-4" />}
                {v === "list" ? "목록" : "지도"}
              </button>
            ))}
          </div>
        </div>
      </section>

      {st.view === "map" ? (
        <div className="card overflow-hidden">
          <div className="flex flex-wrap items-center gap-2 border-b border-line p-2">
            <span className="label px-1">함께 보기</span>
            <button
              type="button"
              className="chip"
              aria-pressed={layers.nanum}
              onClick={() => setLayers((l) => ({ ...l, nanum: !l.nanum }))}
            >
              <span aria-hidden="true" className="inline-block size-2.5 rounded-full bg-[#d97706] ring-2 ring-white" />
              무장애나눔길
            </button>
            <button
              type="button"
              className="chip"
              aria-pressed={layers.toilet}
              onClick={() => setLayers((l) => ({ ...l, toilet: !l.toilet }))}
            >
              <span aria-hidden="true" className="inline-block size-2.5 rounded-full bg-[#2563eb] ring-2 ring-white" />
              장애인·어린이 화장실
            </button>
          </div>
          <div className="relative">
            <ForestMap
              forests={rows.map((r) => r.f)}
              nanum={nanum}
              toilets={toilets}
              layers={layers}
              selectedId={selectedId}
              onSelect={setSelectedId}
              myLoc={myLoc}
            />
            {selected && (
              <div className="absolute inset-x-2 bottom-2 z-[1000] sm:left-auto sm:w-96">
                <ForestCard row={selected} onClose={() => setSelectedId(null)} />
              </div>
            )}
          </div>
          <p className="p-3 text-sm text-muted">
            초록 원을 누르면 요약 카드가 열립니다. 숫자 원은 가까운 휴양림 묶음이며, 누르면 확대됩니다.
          </p>
        </div>
      ) : (
        <>
          <ul className="grid gap-3 sm:grid-cols-2">
            {rows.slice(0, limit).map((r) => (
              <li key={r.f.id}>
                <ForestCard row={r} />
              </li>
            ))}
          </ul>
          {rows.length === 0 && (
            <p className="card p-8 text-center text-muted">조건에 맞는 숲이 없습니다. 필터를 줄여 보세요.</p>
          )}
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

type Fact = { icon: typeof Accessibility; text: string };

function ForestCard({
  row,
  onClose,
}: {
  row: { f: ForestSummary; cov: { known: number; total: number }; dist: number | null };
  onClose?: () => void;
}) {
  const { f, cov, dist } = row;
  const book = bookingLink(f.homepage, f.national || f.ownership === "국유림");
  const facts: Fact[] = [];
  if (f.stay === true) facts.push({ icon: BedDouble, text: f.roomCount ? `숙박 객실 ${f.roomCount}실` : "숙박 가능" });
  if (f.stay === false) facts.push({ icon: BedDouble, text: "당일 방문 (숙박 없음)" });
  if (f.disabledLotteryRooms)
    facts.push({ icon: Accessibility, text: `장애인 추첨·우선예약 객실 ${f.disabledLotteryRooms}실` });
  if (f.discount) facts.push({ icon: Percent, text: "장애인 이용료 할인" });
  if (f.nearestDisabledToilet)
    facts.push({ icon: Toilet, text: `장애인 화장실 있는 공중화장실 ${km(f.nearestDisabledToilet.distKm)}` });
  if (f.nanumNearest) facts.push({ icon: Route, text: `무장애나눔길 ${km(f.nanumNearest.distKm)}` });
  if (f.kidsForest) facts.push({ icon: Baby, text: "유아숲체험원" });
  if (f.multiChildLotteryRooms) facts.push({ icon: Users, text: `다자녀 추첨 객실 ${f.multiChildLotteryRooms}실` });
  if (f.lotteryRate) facts.push({ icon: Ticket, text: `주말 추첨 평균 경쟁률 ${f.lotteryRate}:1` });

  return (
    <article className="card card-hover flex h-full flex-col gap-3 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="mb-1.5 flex flex-wrap gap-1">
            {f.ownership && <span className={`tag ${f.ownership === "국유림" ? "tag-brand" : ""}`}>{f.ownership}</span>}
            {f.closed && <span className="tag tag-no">휴장</span>}
          </div>
          <h2 className="text-lg font-bold">
            <Link href={`/forest/${f.id}`} className="underline-offset-4 hover:underline">
              {f.name}
            </Link>
          </h2>
          <p className="text-sm text-muted">
            {f.sido} {f.sigungu}
            {dist != null && <> · 내 위치에서 {km(dist)}</>}
          </p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="btn btn-ghost btn-sm -mr-1 -mt-1 px-2"
            aria-label="요약 카드 닫기"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        )}
      </div>
      {facts.length > 0 && (
        <ul className="space-y-1 text-[0.9rem]">
          {facts.slice(0, onClose ? 4 : 6).map((t) => (
            <li key={t.text} className="flex items-center gap-2">
              <t.icon aria-hidden="true" className="size-4 shrink-0 text-muted" strokeWidth={2} />
              {t.text}
            </li>
          ))}
        </ul>
      )}
      <div className="mt-auto space-y-1 border-t border-line pt-3">
        <CoverageBar known={cov.known} total={cov.total} />
        <p className="text-xs text-muted">
          공공데이터 {f.sourceCount}종 연결 · 기본정보 기준일 {f.refDate || "–"}
        </p>
      </div>
      <div className="flex gap-2">
        <Link href={`/forest/${f.id}`} className="btn btn-primary flex-1">
          자세히 보기 <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
        {book && (
          <a
            href={book.url}
            target="_blank"
            rel="noreferrer"
            className="btn btn-outline px-3"
            aria-label={`${f.name} ${book.foresttrip ? "숲나들e에서 예약" : "홈페이지에서 예약 확인"} (새 창)`}
          >
            <CalendarCheck aria-hidden="true" className="size-4" /> 예약
          </a>
        )}
        {f.tel && (
          <a
            href={`tel:${f.tel.replace(/[^0-9+]/g, "")}`}
            className="btn btn-outline px-3"
            aria-label={`${f.name} 전화 ${f.tel}`}
          >
            <Phone aria-hidden="true" className="size-4" /> 전화
          </a>
        )}
      </div>
    </article>
  );
}
