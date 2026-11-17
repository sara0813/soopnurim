"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Accessibility,
  ArrowRight,
  Baby,
  BedDouble,
  Bus,
  CalendarCheck,
  ChevronDown,
  FileCheck2,
  Globe2,
  List,
  LocateFixed,
  Map as MapIcon,
  MessageSquareText,
  Percent,
  Phone,
  PhoneCall,
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
import { sidoOptions, sidoRank, sidoShort } from "@/lib/regions";
import { coverage } from "@/lib/coverage";
import { ACCESS_MASK, GROUPS, groupsMask } from "@/lib/groups";
import { fixedEn, href, kmOf, type Lang } from "@/lib/i18n";
import { nameOf, placeEn, regionOf, sidoEn } from "@/lib/romanize";
import { useGroups } from "@/lib/useGroups";
import { useLang } from "@/lib/useLang";
import type { ForestSummary, NanumPoint, ToiletPoint } from "@/lib/types";

const ForestMap = dynamic(() => import("./ForestMap"), {
  ssr: false,
  loading: () => <p className="p-6 text-center text-muted">…</p>,
});

const PAGE = 24;
const STATE_KEY = "soopnurim.explorer";

const CHIPS = [
  { id: "stay", label: "숙박 가능", en: "Overnight stay", test: (f: ForestSummary) => f.stay === true },
  { id: "disabledRoom", label: "장애인 추첨·우선예약 객실", en: "Disabled lottery/priority rooms", test: (f: ForestSummary) => f.disabledLotteryRooms > 0 },
  { id: "discount", label: "장애인 할인", en: "Disability discount", test: (f: ForestSummary) => f.discount },
  { id: "disabledToilet", label: "1.5km 안 장애인 화장실", en: "Accessible toilet within 1.5 km", test: (f: ForestSummary) => !!f.nearestDisabledToilet },
  { id: "nanum", label: "무장애나눔길 3km 안", en: "Barrier-free trail within 3 km", test: (f: ForestSummary) => !!f.nanumNearest },
  { id: "bus", label: "버스정류장 1km 안", en: "Bus stop within 1 km", test: (f: ForestSummary) => f.busNearestKm != null && f.busNearestKm <= 1 },
  { id: "kids", label: "유아숲체험원", en: "Children's forest", test: (f: ForestSummary) => f.kidsForest },
  { id: "multiChild", label: "다자녀 추첨 객실", en: "Large-family lottery", test: (f: ForestSummary) => f.multiChildLotteryRooms > 0 },
  { id: "national", label: "국립", en: "National", test: (f: ForestSummary) => f.ownership === "국유림" },
  { id: "open", label: "휴장 제외", en: "Hide closed", test: (f: ForestSummary) => !f.closed },
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

type Row = { f: ForestSummary; cov: { known: number; total: number }; dist: number | null };
const ratio = (c: { known: number; total: number }) => (c.total ? c.known / c.total : 0);

/** 거리순: 위치(좌표)가 없는 휴양림은 맨 뒤, 나머지는 가까운 순 */
function byDistance(a: { dist: number | null }, b: { dist: number | null }) {
  if (a.dist === null && b.dist === null) return 0;
  if (a.dist === null) return 1;
  if (b.dist === null) return -1;
  return a.dist - b.dist;
}

export default function Explorer({
  forests,
  nanum,
  toilets,
  datasetCount,
  exampleId,
}: {
  forests: ForestSummary[];
  nanum: NanumPoint[];
  toilets: ToiletPoint[];
  datasetCount: number;
  exampleId: string | null;
}) {
  const { lang, t } = useLang();
  const en = lang === "en";
  const { groups } = useGroups();
  // 유형을 고르지 않았을 때의 분모: 한국어 화면은 보행약자 세 유형, 영어 화면은 외국인 항목까지 모두
  const mask = groupsMask(groups) || (en ? 0 : ACCESS_MASK);
  const [st, setSt] = useState<UiState>(DEFAULT);
  const [limit, setLimit] = useState(PAGE);
  const [myLoc, setMyLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [locMsg, setLocMsg] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [layers, setLayers] = useState<MapLayers>({ nanum: true, toilet: false });
  const [panelOpen, setPanelOpen] = useState(false);
  const display = useMemo(() => new Map(forests.map((f) => [f.id, nameOf(lang, f.name)])), [forests, lang]);
  const nm = (f: ForestSummary) => display.get(f.id) ?? f.name;

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

  // 검색어·조건을 적용한 휴양림 (지역 선택 전). 시·도·시·군·구 옆 숫자도 이 기준으로 센다.
  const base = useMemo(() => {
    const kw = st.q.trim().replace(/\s/g, "").toLowerCase();
    const active = CHIPS.filter((c) => st.chips.includes(c.id));
    return forests
      .filter(
        (f) =>
          !kw ||
          (f.name + f.address + f.sido + sidoShort(f.sido) + f.sigungu + (display.get(f.id) ?? "") + sidoEn(f.sido) + placeEn(f.sigungu))
            .replace(/\s/g, "")
            .toLowerCase()
            .includes(kw),
      )
      .filter((f) => active.every((c) => c.test(f)));
  }, [forests, st.q, st.chips, display]);
  const sidos = useMemo(() => {
    const counts = new Map<string, number>();
    for (const f of forests) if (f.sido && !counts.has(f.sido)) counts.set(f.sido, 0);
    for (const f of base) if (f.sido) counts.set(f.sido, (counts.get(f.sido) ?? 0) + 1);
    return sidoOptions(counts);
  }, [forests, base]);
  const sggs = useMemo(() => {
    const counts = new Map<string, number>();
    for (const f of forests) if (f.sido === st.sido && f.sigungu && !counts.has(f.sigungu)) counts.set(f.sigungu, 0);
    for (const f of base) if (f.sido === st.sido && f.sigungu) counts.set(f.sigungu, (counts.get(f.sigungu) ?? 0) + 1);
    return [...counts].sort((a, b) => a[0].localeCompare(b[0], "ko")).map(([name, count]) => ({ name, count }));
  }, [forests, base, st.sido]);

  const rows = useMemo(() => {
    const out: Row[] = base
      .filter((f) => !st.sido || f.sido === st.sido)
      .filter((f) => !st.sgg || f.sigungu === st.sgg)
      .map((f) => ({
        f,
        cov: coverage(f.items, mask),
        dist: myLoc && f.lat != null && f.lng != null ? hav(myLoc, { lat: f.lat, lng: f.lng }) : null,
      }));
    const byName = (a: Row, b: Row) => nm(a.f).localeCompare(nm(b.f), en ? "en" : "ko");
    out.sort((a, b) => {
      if (st.sort === "distance") return byDistance(a, b) || byName(a, b);
      if (st.sort === "coverage") return ratio(b.cov) - ratio(a.cov) || b.cov.known - a.cov.known || byName(a, b);
      if (st.sort === "region")
        return sidoRank(a.f.sido) - sidoRank(b.f.sido) || a.f.sigungu.localeCompare(b.f.sigungu, "ko") || byName(a, b);
      return byName(a, b);
    });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base, st.sido, st.sgg, st.sort, mask, myLoc, en, display]);

  const locate = () => {
    if (!("geolocation" in navigator)) {
      setLocMsg(t("이 브라우저는 위치 기능을 지원하지 않습니다.", "This browser does not support location."));
      return;
    }
    setLocMsg(t("위치를 찾는 중…", "Finding your location…"));
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setMyLoc({ lat: p.coords.latitude, lng: p.coords.longitude });
        setLocMsg(
          t(
            "내 위치에서 가까운 순(직선거리)으로 정렬했습니다. 위치는 이 기기 안에서만 쓰이고 저장·전송하지 않습니다.",
            "Sorted by straight-line distance from you. Your location stays on this device and is not stored or sent.",
          ),
        );
        update({ sort: "distance" });
      },
      () => setLocMsg(t("위치를 가져오지 못했습니다. 브라우저의 위치 권한을 확인해 주세요.", "Could not get your location. Check the browser's location permission.")),
      { enableHighAccuracy: false, timeout: 10000 },
    );
  };

  const example = forests.find((f) => f.id === exampleId) ?? null;
  const itemTotal = forests[0] ? coverage(forests[0].items, mask).total : 0;
  const selected = rows.find((r) => r.f.id === selectedId) ?? null;
  const activeCount = (st.sido ? 1 : 0) + st.chips.filter((c) => c !== "open").length + (st.sort !== "name" ? 1 : 0);
  const filtered = st.q || st.sido || st.chips.length > 1 || (st.chips.length === 1 && st.chips[0] !== "open");
  const groupNames = groups.length
    ? GROUPS.filter((g) => groups.includes(g.id))
        .map((g) => (en ? g.label_en : g.label))
        .join(", ")
    : "";

  return (
    <div className="space-y-5">
      <section aria-labelledby="intro" className="space-y-3 pt-1">
        <p className="eyebrow">
          {t(`숲누림 · 공공데이터 ${datasetCount}종 · 휴양림 ${forests.length}곳`, `Soopnurim · ${datasetCount} open datasets · ${forests.length} forests`)}
        </p>
        <h1 id="intro" className="text-[1.6rem] font-bold leading-snug sm:text-[2rem]">
          {en ? (
            <>
              Your family&rsquo;s forest trip:
              <br /> check before you go
            </>
          ) : (
            <>
              우리 가족의 숲 여행,
              <br /> 출발 전에 확인하세요
            </>
          )}
        </h1>
        <p className="max-w-2xl text-muted">
          {t(
            "휠체어·고령자·유아 동반 가족과 외국인 여행자를 위해 흩어진 휴양림 정보를 모았어요. 확인된 정보는 출처와 함께, 부족한 정보는 물어볼 질문으로 안내합니다.",
            "Scattered information on Korea's recreation forests, gathered for wheelchair users, older adults, families with young children and foreign visitors. Verified facts come with sources; missing ones become questions to ask.",
          )}
        </p>
        {example && (
          <Link href={href(lang, `/forest/${example.id}`)} className="btn btn-primary btn-wrap">
            <span className="min-w-0">
              {t("예시 보기", "See an example")}: {nm(example)}
            </span>
            <ArrowRight aria-hidden="true" className="size-4 shrink-0" />
          </Link>
        )}
        <ul className="card grid divide-y divide-line sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {[
            {
              icon: FileCheck2,
              title: t("확인된 정보는 출처와 함께", "Verified facts, with sources"),
              text: t("예약부터 숲길·안전까지 단계별로", "Step by step, from booking to trails and safety"),
            },
            {
              icon: PhoneCall,
              title: t("미확인 정보는 질문으로", "Unverified items become questions"),
              text: t("운영기관에 물어볼 말을 정리해 드려요", "Ready-made questions in Korean for the operator"),
            },
            {
              icon: MessageSquareText,
              title: t("다녀온 사람의 제보", "Reports from visitors"),
              text: t("실제 상태를 방문 시기와 함께", "What they found, with the visit date"),
            },
          ].map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex items-center gap-3 px-4 py-3.5">
              <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-fg">
                <Icon className="size-[18px]" strokeWidth={2} />
              </span>
              <span className="min-w-0">
                <span className="block font-semibold">{title}</span>
                <span className="block text-sm text-muted">{text}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <div className="card space-y-2 p-4">
        <GroupPicker compact />
        <p className="text-sm text-muted">
          {groups.length
            ? t(
                `정보 확인도는 ${groupNames}에게 필요한 ${itemTotal}개 항목 기준이에요.`,
                `Info coverage counts the ${itemTotal} items needed by: ${groupNames}.`,
              )
            : t(
                `아무도 고르지 않으면 휠체어·고령자·유아 동반에 필요한 ${itemTotal}개 항목 기준으로 정보 확인도를 보여 드려요.`,
                `With no one selected, info coverage counts all ${itemTotal} items, including those for foreign visitors.`,
              )}{" "}
          {t(
            "정보가 많다는 뜻이지, 시설이 더 안전하거나 이용하기 좋다는 뜻은 아니에요.",
            "More information does not mean the forest is safer or easier to use.",
          )}
        </p>
      </div>

      {/* 검색·필터: 검색줄만 위에 고정, 상세 조건은 펼쳐서 */}
      <section aria-label={t("검색과 필터", "Search and filters")} className="card sticky top-0 z-[1100] space-y-3 p-3 shadow-[0_4px_12px_rgb(15_15_15/0.06)]">
        <div className="flex gap-2">
          <label className="relative flex-1">
            <span className="sr-only">{t("숲 이름·지역 검색", "Search by forest or area")}</span>
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <input
              type="search"
              value={st.q}
              onChange={(e) => update({ q: e.target.value })}
              placeholder={t("숲 이름이나 지역 (예: 유명산, 가평)", "Forest or area (e.g. Yumyeongsan, Gapyeong)")}
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
            {t("필터", "Filters")}
            {activeCount ? ` ${activeCount}` : ""}
            <ChevronDown aria-hidden="true" className={`size-4 transition-transform ${panelOpen ? "rotate-180" : ""}`} />
          </button>
        </div>
        <div id="filter-panel" className={`${panelOpen ? "block" : "hidden"} space-y-3 sm:block`}>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <label className="flex flex-col gap-1">
              <span className="label">{t("시·도", "Province")}</span>
              <select value={st.sido} onChange={(e) => update({ sido: e.target.value, sgg: "" })} className="field">
                <option value="">{t(`전국 (${base.length}곳)`, `All Korea (${base.length})`)}</option>
                {sidos.map((s) => (
                  <option key={s.name} value={s.name} disabled={s.count === 0 && s.name !== st.sido}>
                    {en ? sidoEn(s.name) : s.short} ({t(`${s.count}곳`, `${s.count}`)})
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="label">{t("시·군·구", "City / county")}</span>
              <select value={st.sgg} onChange={(e) => update({ sgg: e.target.value })} className="field disabled:opacity-50" disabled={!st.sido}>
                <option value="">
                  {st.sido
                    ? t(`전체 (${sidos.find((x) => x.name === st.sido)?.count ?? 0}곳)`, `All (${sidos.find((x) => x.name === st.sido)?.count ?? 0})`)
                    : t("시·도 먼저 선택", "Choose a province first")}
                </option>
                {sggs.map((s) => (
                  <option key={s.name} value={s.name} disabled={s.count === 0 && s.name !== st.sgg}>
                    {en ? placeEn(s.name) : s.name} ({t(`${s.count}곳`, `${s.count}`)})
                  </option>
                ))}
              </select>
            </label>
            <label className="col-span-2 flex flex-col gap-1 sm:col-span-1">
              <span className="label">{t("정렬", "Sort")}</span>
              <select value={st.sort} onChange={(e) => update({ sort: e.target.value as Sort })} className="field">
                <option value="name">{t("이름순", "Name")}</option>
                <option value="region">{t("지역순", "Region")}</option>
                <option value="coverage">{t("확인된 정보 많은 순", "Most verified info")}</option>
                <option value="distance" disabled={!myLoc}>
                  {t("내 위치에서 가까운 순", "Nearest to me")}
                  {myLoc ? "" : t(" (내 위치 필요)", " (needs location)")}
                </option>
              </select>
            </label>
          </div>
          <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible" role="group" aria-label={t("조건 필터", "Filters")}>
            <button type="button" className="chip" aria-pressed={!!myLoc} onClick={locate}>
              <LocateFixed aria-hidden="true" className="size-4" /> {t("내 위치", "My location")}
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
                  {en ? c.en : c.label}
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
            <span className="text-base font-bold tabular-nums">{rows.length}</span>
            {t("곳", rows.length === 1 ? " forest" : " forests")}
            {filtered && (
              <button type="button" className="ml-2 text-sm font-medium text-muted underline underline-offset-2" onClick={() => update({ ...DEFAULT, view: st.view })}>
                {t("조건 초기화", "Reset")}
              </button>
            )}
          </p>
          <div role="tablist" aria-label={t("보기 방식", "View")} className="seg">
            {(["list", "map"] as const).map((v) => (
              <button key={v} type="button" role="tab" aria-selected={st.view === v} onClick={() => update({ view: v })}>
                {v === "list" ? <List aria-hidden="true" className="size-4" /> : <MapIcon aria-hidden="true" className="size-4" />}
                {v === "list" ? t("목록", "List") : t("지도", "Map")}
              </button>
            ))}
          </div>
        </div>
      </section>

      {st.view === "map" ? (
        <div className="card overflow-hidden">
          <div className="flex flex-wrap items-center gap-2 border-b border-line p-2">
            <span className="label px-1">{t("함께 보기", "Also show")}</span>
            <button type="button" className="chip" aria-pressed={layers.nanum} onClick={() => setLayers((l) => ({ ...l, nanum: !l.nanum }))}>
              <span aria-hidden="true" className="inline-block size-2.5 rounded-full bg-[#dd5b00] ring-2 ring-white" />
              {t("무장애나눔길", "Barrier-free trails")}
            </button>
            <button type="button" className="chip" aria-pressed={layers.toilet} onClick={() => setLayers((l) => ({ ...l, toilet: !l.toilet }))}>
              <span aria-hidden="true" className="inline-block size-2.5 rounded-full bg-[#0075de] ring-2 ring-white" />
              {t("장애인·어린이 화장실", "Accessible and children's toilets")}
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
                <ForestCard row={selected} name={nm(selected.f)} lang={lang} onClose={() => setSelectedId(null)} />
              </div>
            )}
          </div>
          <p className="p-3 text-sm text-muted">
            {t("휴양림 표시를 누르면 요약이 열려요. 숫자 원은 누르면 확대돼요.", "Tap a forest pin for a summary. Tap a numbered circle to zoom in.")}
          </p>
        </div>
      ) : (
        <>
          <ul className="grid gap-3 sm:grid-cols-2">
            {rows.slice(0, limit).map((r) => (
              <li key={r.f.id}>
                <ForestCard row={r} name={nm(r.f)} lang={lang} />
              </li>
            ))}
          </ul>
          {rows.length === 0 && (
            <div className="card space-y-3 p-8 text-center">
              <p className="font-semibold">{t("조건에 맞는 휴양림이 없습니다", "No forests match")}</p>
              <p className="text-sm text-muted">
                {st.q
                  ? t(
                      `'${st.q}' 검색 결과가 없습니다. 휴양림 이름 일부나 시·군 이름(예: 가평, 인제)으로 찾아보세요.`,
                      `No results for '${st.q}'. Try part of a forest name or a city/county (e.g. Gapyeong, Inje).`,
                    )
                  : t("선택한 조건을 몇 개 풀어 보세요.", "Try removing some filters.")}
              </p>
              <button type="button" className="btn btn-outline" onClick={() => update({ ...DEFAULT, view: st.view })}>
                {t("조건 초기화", "Reset")}
              </button>
            </div>
          )}
          {rows.length > limit && (
            <div className="text-center">
              <button className="btn btn-outline" onClick={() => setLimit((l) => l + PAGE)}>
                {t(`더 보기 (${rows.length - limit}곳 남음)`, `Show more (${rows.length - limit} left)`)}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

type Fact = { icon: typeof Accessibility; text: string };

function ForestCard({ row, name, lang, onClose }: { row: Row; name: string; lang: Lang; onClose?: () => void }) {
  const { t } = useLang();
  const km = (d: number) => kmOf(lang, d);
  const { f, cov, dist } = row;
  const book = bookingLink(f.homepage, f.national || f.ownership === "국유림");
  // 휴양림 자체 정보
  const facts: Fact[] = [];
  if (f.stay === true) facts.push({ icon: BedDouble, text: f.roomCount ? t(`숙박 객실 ${f.roomCount}실`, `${f.roomCount} rooms`) : t("숙박 가능", "Overnight stay") });
  if (f.stay === false) facts.push({ icon: BedDouble, text: t("당일 방문 (숙박 없음)", "Day visit only (no lodging)") });
  if (f.disabledLotteryRooms)
    facts.push({ icon: Accessibility, text: t(`장애인 추첨·우선예약 객실 ${f.disabledLotteryRooms}실`, `${f.disabledLotteryRooms} disabled lottery/priority rooms`) });
  if (f.discount) facts.push({ icon: Percent, text: t("장애인 이용료 할인", "Disability discount") });
  if (f.asean) facts.push({ icon: Globe2, text: t("아세안 우선예약 객실", "ASEAN priority rooms") });
  if (f.kidsForest) facts.push({ icon: Baby, text: t("유아숲체험원", "Children's forest") });
  if (f.multiChildLotteryRooms) facts.push({ icon: Users, text: t(`다자녀 추첨 객실 ${f.multiChildLotteryRooms}실`, `${f.multiChildLotteryRooms} large-family lottery rooms`) });
  if (f.lotteryRate) facts.push({ icon: Ticket, text: t(`주말 추첨 평균 경쟁률 ${f.lotteryRate}:1`, `Weekend lottery ${f.lotteryRate}:1`) });
  // 주변 시설: 좌표 직선거리로만 연결 → 길로 이어지는지, 휴양림 안인지 모름
  const near: Fact[] = [];
  if (f.nearestDisabledToilet)
    near.push({ icon: Toilet, text: t(`장애인 화장실 있는 공중화장실 ${km(f.nearestDisabledToilet.distKm)}`, `Public toilet with accessible stall ${km(f.nearestDisabledToilet.distKm)}`) });
  if (f.nanumNearest) near.push({ icon: Route, text: t(`무장애나눔길 ${km(f.nanumNearest.distKm)}`, `Barrier-free trail ${km(f.nanumNearest.distKm)}`) });
  if (f.busNearestKm != null) near.push({ icon: Bus, text: t(`버스정류장 ${km(f.busNearestKm)}`, `Bus stop ${km(f.busNearestKm)}`) });
  const max = onClose ? 3 : 5;

  return (
    <article className="card card-hover flex h-full flex-col gap-3 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="mb-1.5 flex flex-wrap gap-1">
            {f.ownership && <span className={`tag ${f.ownership === "국유림" ? "tag-brand" : ""}`}>{fixedEn(lang, f.ownership)}</span>}
            {f.closed && <span className="tag tag-no">{f.notOpen ? t("미운영", "Not operating") : t("휴장", "Closed")}</span>}
          </div>
          <h2 className="text-lg font-bold">
            <Link href={href(lang, `/forest/${f.id}`)} className="underline-offset-4 hover:underline">
              {name}
            </Link>
          </h2>
          <p className="text-sm text-muted">
            {regionOf(lang, f.sido, f.sigungu)}
            {dist != null && <> · {t(`내 위치에서 직선 ${km(dist)}`, `${km(dist)} from you (straight line)`)}</>}
          </p>
        </div>
        {onClose && (
          <button type="button" onClick={onClose} className="btn btn-ghost btn-sm -mr-1 -mt-1 px-2" aria-label={t("요약 카드 닫기", "Close summary")}>
            <X aria-hidden="true" className="size-5" />
          </button>
        )}
      </div>
      {facts.length > 0 && (
        <ul className="space-y-1 text-[0.9rem]">
          {facts.slice(0, max).map((x) => (
            <li key={x.text} className="flex items-center gap-2">
              <x.icon aria-hidden="true" className="size-4 shrink-0 text-muted" strokeWidth={2} />
              {x.text}
            </li>
          ))}
        </ul>
      )}
      {near.length > 0 && (
        <div className="rounded-lg border border-dashed border-line-strong px-3 py-2">
          <p className="text-xs font-semibold text-muted">
            {t("주변 · 직선거리 (길·휴양림 안 여부 미확인)", "Nearby · straight line (route and location not verified)")}
          </p>
          <ul className="mt-1 space-y-0.5 text-[0.88rem]">
            {near.slice(0, onClose ? 2 : 3).map((x) => (
              <li key={x.text} className="flex items-center gap-2">
                <x.icon aria-hidden="true" className="size-4 shrink-0 text-muted" strokeWidth={2} />
                {x.text}
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="mt-auto space-y-1 border-t border-line pt-3">
        <CoverageBar known={cov.known} total={cov.total} />
        <p className="text-xs text-muted">
          {t(`데이터 ${f.sourceCount}종 · 기준일 ${f.refDate || "–"}`, `${f.sourceCount} datasets · as of ${f.refDate || "–"}`)}
        </p>
      </div>
      <div className="flex gap-2">
        <Link href={href(lang, `/forest/${f.id}`)} className="btn btn-primary flex-1">
          {t("자세히 보기", "Details")} <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
        {book && (
          <a
            href={book.url}
            target="_blank"
            rel="noreferrer"
            className="btn btn-outline px-3"
            aria-label={t(
              `${name} ${book.foresttrip ? "숲나들e에서 예약" : "홈페이지에서 예약 확인"} (새 창)`,
              `${name}: ${book.foresttrip ? "book on Foresttrip" : "booking on website"} (new window)`,
            )}
          >
            <CalendarCheck aria-hidden="true" className="size-4" /> {t("예약", "Book")}
          </a>
        )}
        {f.tel && (
          <a href={`tel:${f.tel.replace(/[^0-9+]/g, "")}`} className="btn btn-outline px-3" aria-label={t(`${name} 전화 ${f.tel}`, `Call ${name} ${f.tel}`)}>
            <Phone aria-hidden="true" className="size-4" /> {t("전화", "Call")}
          </a>
        )}
      </div>
    </article>
  );
}
