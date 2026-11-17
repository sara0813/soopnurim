"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  CircleCheck,
  CircleDashed,
  CircleX,
  ClipboardCopy,
  ExternalLink,
  Flag,
  MessageSquarePlus,
  Phone,
  TriangleAlert,
} from "lucide-react";
import CoverageBar from "./CoverageBar";
import GroupPicker from "./GroupPicker";
import ReportForm, { ANSWER_LABEL, ANSWER_LABEL_EN, type Report } from "./ReportForm";
import LensPanel from "./LensPanel";
import { ITEM_KEYS } from "@/lib/reportKeys";
import { ACCESS_MASK, STEPS, groupsMask } from "@/lib/groups";
import { useGroups } from "@/lib/useGroups";
import { useLang } from "@/lib/useLang";
import type { Group, JourneyItem, Status } from "@/lib/types";

// '빈칸'은 영어로 Not verified: 'Not available'로 옮기면 시설이 없다는 뜻으로 읽히므로 구분한다
const STATUS: Record<Status, { icon: typeof CircleCheck; label: string; en: string }> = {
  ok: { icon: CircleCheck, label: "확인됨", en: "Verified" },
  warn: { icon: TriangleAlert, label: "추가 확인 필요", en: "Needs checking" },
  no: { icon: CircleX, label: "없음", en: "Not available" },
  unknown: { icon: CircleDashed, label: "빈칸", en: "Not verified" },
};

const SRC = {
  public: { label: "공공데이터", en: "Public data", cls: "src-public" },
  operator: { label: "운영자 확인", en: "Operator checked", cls: "src-operator" },
  user: { label: "이용자 제보", en: "Visitor report", cls: "src-user" },
};

type ReportState = { mode: string; reports: Report[] } | null;
const FLAG_KEY = "soopnurim.flagged";

export default function JourneyView({
  items,
  tel,
  forestId,
  forestName,
  coreKeys,
}: {
  items: JourneyItem[];
  tel: string;
  forestId: string;
  forestName: string;
  coreKeys: Record<Group, string[]>;
}) {
  const { groups } = useGroups();
  const { lang, t } = useLang();
  // 유형을 고르지 않았을 때: 한국어 화면은 보행약자 세 유형, 영어 화면은 외국인 항목까지 모두
  const mask = groupsMask(groups) || (lang === "en" ? 0 : ACCESS_MASK);
  const rel = useMemo(() => (mask ? items.filter((it) => groupsMask(it.groups) & mask) : items), [items, mask]);
  const known = rel.filter((i) => i.status !== "unknown").length;

  // 이용자 제보 불러오기 (페이지는 정적 생성, 제보만 실시간)
  const [rs, setRs] = useState<ReportState>(null);
  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/reports?forest=${encodeURIComponent(forestId)}`, { cache: "no-store" });
      if (r.ok) setRs(await r.json());
      else setRs({ mode: "error", reports: [] });
    } catch {
      setRs({ mode: "error", reports: [] });
    }
  }, [forestId]);
  useEffect(() => {
    load();
  }, [load]);
  const byItem = useMemo(() => {
    const m = new Map<string, Report[]>();
    for (const r of rs?.reports ?? []) m.set(r.itemKey, [...(m.get(r.itemKey) ?? []), r]);
    return m;
  }, [rs]);

  // 질문: 선택한 유형의 핵심 항목부터
  const askable = rel.filter((i) => (i.status === "unknown" || i.status === "warn") && i.question);
  const defaults: Group[] = lang === "en" ? ["foreign", "wheelchair", "elder", "child"] : ["wheelchair", "elder", "child"];
  const order = (groups.length ? groups : defaults).flatMap((g) => coreKeys[g]);
  const rank = (k: string) => {
    const i = order.indexOf(k);
    return i === -1 ? 99 : i;
  };
  const questions = [...askable].sort((a, b) => rank(a.key) - rank(b.key)).map((i) => ({ q: i.question, ko: i.questionKo }));

  return (
    <div className="space-y-4">
      <div className="card space-y-4 p-4 sm:p-5">
        <GroupPicker compact />
        {!groups.length && (
          <p className="text-sm text-muted">
            {t(
              "고르면 필요한 항목만 보여 드려요. 외국인 여행자 항목은 '외국인 여행자'를 고르면 보여요.",
              "Choose to see only what you need. All items are shown now.",
            )}
          </p>
        )}
        <CoverageBar known={known} total={rel.length} size="lg" />
      </div>

      {rs?.mode === "error" && (
        <p role="status" className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-line bg-surface px-4 py-3 text-sm">
          <span className="text-muted">
            {t(
              "이용자 제보를 불러오지 못했습니다. 공공데이터 정보는 그대로 볼 수 있습니다.",
              "Could not load visitor reports. Public data is still shown.",
            )}
          </span>
          <button type="button" className="font-semibold text-brand-strong underline underline-offset-2" onClick={load}>
            {t("다시 시도", "Try again")}
          </button>
        </p>
      )}

      {/* 단계는 접어 두고 확인·빈칸 수만 보여 준다. 누르면 항목과 출처가 펼쳐진다 */}
      <ol className="card divide-y divide-line overflow-hidden">
        {STEPS.map((s) => {
          const its = rel.filter((i) => i.step === s.step);
          if (!its.length) return null;
          const filled = its.filter((i) => i.status !== "unknown");
          const blank = its.filter((i) => i.status === "unknown");
          const repN = its.reduce((n, i) => n + (byItem.get(i.key)?.length ?? 0), 0);
          return (
            <li key={s.step}>
              <details id={`step-${s.step}`} className="scroll-mt-4">
                <summary className="flex min-h-16 cursor-pointer items-center gap-3 px-4 py-3 hover:bg-surface-2">
                  <span
                    aria-hidden="true"
                    className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-fill text-sm font-bold text-white"
                  >
                    {s.step}
                  </span>
                  <span className="min-w-0 flex-1">
                    <h3 className="font-bold leading-snug">{lang === "en" ? s.title_en : s.title}</h3>
                    <span className="block text-xs text-muted">{lang === "en" ? s.desc_en : s.desc}</span>
                  </span>
                  <span className="shrink-0 text-right text-xs tabular-nums">
                    <span className="block font-semibold">{t(`확인 ${filled.length}`, `${filled.length} found`)}</span>
                    <span className="block text-muted">
                      {t(`빈칸 ${blank.length}`, `${blank.length} blank`)}
                      {repN > 0 && t(` · 제보 ${repN}`, ` · ${repN} rep.`)}
                    </span>
                  </span>
                  <ChevronDown aria-hidden="true" className="chev size-5 shrink-0 text-muted" />
                </summary>
                <div className="border-t border-line bg-[var(--bg)] px-4">
                  {filled.length > 0 && (
                    <ul className="divide-y divide-line">
                      {filled.map((it) => (
                        <ItemRow key={it.key} it={it} reports={byItem.get(it.key)} forestId={forestId} onDone={load} mode={rs?.mode} />
                      ))}
                    </ul>
                  )}
                  {blank.length > 0 && (
                    <div className={filled.length ? "border-t border-dashed border-line-strong" : ""}>
                      <p className="flex items-center gap-1.5 pt-3 text-xs font-semibold text-muted">
                        <CircleDashed aria-hidden="true" className="size-3.5 text-blank" />
                        {t(`공공데이터에 없는 항목 ${blank.length}개`, `${blank.length} not in public data`)}
                      </p>
                      <ul className="divide-y divide-line">
                        {blank.map((it) => (
                          <ItemRow key={it.key} it={it} reports={byItem.get(it.key)} forestId={forestId} onDone={load} mode={rs?.mode} />
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </details>
            </li>
          );
        })}
      </ol>

      <PhoneQuestions questions={questions} tel={tel} forestName={forestName} />
      {rs && rs.mode !== "error" && <LensPanel forestId={forestId} onDone={load} />}
    </div>
  );
}

function ItemRow({
  it,
  reports,
  forestId,
  onDone,
  mode,
}: {
  it: JourneyItem;
  reports?: Report[];
  forestId: string;
  onDone: () => void;
  mode?: string;
}) {
  const st = STATUS[it.status];
  const { lang, t } = useLang();
  const [open, setOpen] = useState(false);
  const canReport =
    ITEM_KEYS.includes(it.key) && it.key !== "stay" && (it.status === "unknown" || it.status === "warn") && mode !== "error" && mode !== undefined;
  return (
    <li className="py-3.5">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <strong className="font-semibold">{it.label}</strong>
        <span className={`st st-${it.status}`}>
          <st.icon aria-hidden="true" className="size-4" strokeWidth={2.25} />
          {lang === "en" ? st.en : st.label}
        </span>
      </div>
      {it.value && <p className="mt-1 text-[0.95rem]">{it.value}</p>}
      {it.source ? (
        <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
          <span className={`src ${SRC[it.source].cls}`}>{lang === "en" ? SRC[it.source].en : SRC[it.source].label}</span>
          {it.sourceUrl ? (
            <a href={it.sourceUrl} target="_blank" rel="noreferrer" className="underline underline-offset-2">
              {it.sourceLabel}
            </a>
          ) : (
            <span>{it.sourceLabel}</span>
          )}
          {it.sourceDate && (
            <span>
              · {t("기준일", "as of")} {it.sourceDate}
            </span>
          )}
        </p>
      ) : it.sourceUrl ? (
        <p className="mt-1 text-xs">
          <a href={it.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-brand-strong underline underline-offset-2">
            {t("참고 자료 열기", "Open reference")} <ExternalLink aria-hidden="true" className="size-3" />
          </a>
        </p>
      ) : null}

      {it.web && it.web.length > 0 && (
        <ul className="mt-2 space-y-1.5">
          {it.web.map((w) => (
            <li key={w.url} className="rounded-lg border border-line px-3 py-2 text-sm">
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
                <span className="src src-web">
                  {w.kind === "official" ? t("운영기관 공개자료", "Operator's published notice") : t("온라인 후기 참고", "Online review")}
                </span>
                <span>{t(`미확인 · 게시 ${w.date}`, `Not verified · posted ${w.date}`)}</span>
              </p>
              <p className="mt-1">{lang === "en" ? (w.summary_en ?? `${w.summary} (Korean original)`) : w.summary}</p>
              <a href={w.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-brand-strong underline underline-offset-2">
                {w.title} <ExternalLink aria-hidden="true" className="size-3" />
              </a>
            </li>
          ))}
        </ul>
      )}

      {reports && reports.length > 0 && <ReportSummary reports={reports} forestId={forestId} onDone={onDone} />}

      {canReport && (
        <div className="mt-2">
          {open ? (
            <ReportForm
              forestId={forestId}
              item={it}
              mode={mode}
              onClose={() => setOpen(false)}
              onDone={() => {
                setOpen(false);
                onDone();
              }}
            />
          ) : (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="inline-flex min-h-10 items-center gap-1.5 text-sm font-medium text-brand-strong"
            >
              <MessageSquarePlus aria-hidden="true" className="size-4" />
              {it.status === "unknown"
                ? t("다녀왔다면 이 빈칸 제보하기", "Been there? Fill in this blank")
                : t("다녀온 경험 제보하기", "Report what you saw")}
            </button>
          )}
        </div>
      )}
    </li>
  );
}

function ReportSummary({ reports, forestId, onDone }: { reports: Report[]; forestId: string; onDone: () => void }) {
  const { lang, t } = useLang();
  const [flagged, setFlagged] = useState<string[]>([]);
  useEffect(() => {
    try {
      setFlagged(JSON.parse(localStorage.getItem(FLAG_KEY) || "[]"));
    } catch {
      /* 저장소 사용 불가 */
    }
  }, []);
  const remember = (id: string) =>
    setFlagged((f) => {
      const next = [...new Set([...f, id])];
      try {
        localStorage.setItem(FLAG_KEY, JSON.stringify(next.slice(-200)));
      } catch {
        /* 무시 */
      }
      return next;
    });
  const count = (a: Report["answer"]) => reports.filter((r) => r.answer === a).length;
  const label = (a: Report["answer"]) => (lang === "en" ? ANSWER_LABEL_EN[a] : ANSWER_LABEL[a]);
  const flag = async (id: string) => {
    if (
      !confirm(
        t(
          "이 제보를 부적절한 내용으로 신고할까요? 신고가 3번 쌓이면 자동으로 숨겨집니다.",
          "Flag this report as inappropriate? It is hidden automatically after 3 flags.",
        ),
      )
    )
      return;
    try {
      await fetch("/api/reports/flag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ forestId, id }),
      });
      remember(id);
      onDone();
    } catch {
      /* 무시 */
    }
  };
  return (
    <div className="mt-2 rounded-lg border border-[var(--src-user)]/30 bg-[color-mix(in_srgb,var(--src-user)_6%,var(--surface))] px-3 py-2">
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
        <span className="src src-user">{t(`이용자 제보 ${reports.length}건`, `${reports.length} visitor report(s)`)}</span>
        <span className="text-muted">
          {label("yes")} {count("yes")} · {label("no")} {count("no")} · {label("unsure")} {count("unsure")}
        </span>
      </p>
      <ul className="mt-1 divide-y divide-line">
        {reports.slice(0, 5).map((r) => (
          <li key={r.id} className="flex items-start gap-2 py-1.5 text-sm">
            <span className="min-w-0 flex-1">
              <span className="font-semibold">{label(r.answer)}</span>
              {r.memo && <> – {r.memo}</>}
              {r.via === "lens" && <span className="ml-1.5 align-middle text-xs text-muted">{t("(사진 보고 확인)", "(checked from a photo)")}</span>}
              <span className="block text-xs text-muted">
                {r.visit ? t(`${r.visit} 방문`, `Visited ${r.visit}`) : t("방문 시기 미기재", "Visit date not given")} ·{" "}
                {t("제보", "reported")} {new Date(r.createdAt).toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" })}
              </span>
            </span>
            <button
              type="button"
              onClick={() => flag(r.id)}
              disabled={flagged.includes(r.id)}
              className="inline-flex min-h-8 shrink-0 items-center gap-1 rounded px-1 text-xs text-muted hover:text-fg disabled:opacity-50"
              aria-label={t("이 제보 신고", "Flag this report")}
            >
              <Flag aria-hidden="true" className="size-3.5" />
              {flagged.includes(r.id) ? t("신고됨", "Flagged") : t("신고", "Flag")}
            </button>
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted">
        {t(
          "제보는 운영기관이나 숲누림이 확인한 정보가 아닙니다. 방문 시기를 함께 보세요.",
          "Reports are not verified by the operator or Soopnurim. Check the visit date.",
        )}
      </p>
    </div>
  );
}

type Question = { q: string; ko?: string };

function PhoneQuestions({ questions, tel, forestName }: { questions: Question[]; tel: string; forestName: string }) {
  const { lang, t } = useLang();
  const en = lang === "en";
  const [copied, setCopied] = useState(false);
  const core = questions.slice(0, 5);
  const rest = questions.slice(5);
  // 영어 화면: 직원에게 보여 주거나 읽을 수 있게 한국어 원문을 먼저, 뜻을 괄호로
  const text = en
    ? `[${forestName} 문의]\n안녕하세요. 외국인 관광객입니다. 아래 내용을 여쭤보고 싶어요.\n` +
      questions.map((x, i) => `${i + 1}. ${x.ko ?? x.q}\n   (${x.q})`).join("\n")
    : `[${forestName} 문의 질문]\n` + questions.map((x, i) => `${i + 1}. ${x.q}`).join("\n");
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  };
  if (!questions.length) return null;
  const Row = ({ x, i, muted }: { x: Question; i: number; muted?: boolean }) => (
    <li className="flex gap-3">
      <span
        className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
          muted ? "bg-surface-2 text-muted" : "bg-brand-soft text-brand-strong"
        }`}
      >
        {i}
      </span>
      <span className="min-w-0">
        {en && x.ko ? (
          <>
            <span lang="ko" className="block font-medium">
              {x.ko}
            </span>
            <span className="block text-sm text-muted">{x.q}</span>
          </>
        ) : (
          x.q
        )}
      </span>
    </li>
  );
  return (
    <section id="ask" aria-labelledby="phone-h" className="card scroll-mt-20 space-y-3 p-4 sm:p-5">
      <div>
        <h3 id="phone-h" className="text-lg font-bold">
          {t("운영기관에 전화로 물어볼 질문", "Questions to ask the operator")}
        </h3>
        <p className="text-sm text-muted">
          {t(
            "빈칸을 질문으로 바꿨습니다. 선택한 이용자 유형에 중요한 질문부터 정렬했어요.",
            "Each blank is turned into a question in Korean you can read out or show to staff, with the meaning in English. Most important first.",
          )}
        </p>
      </div>
      {en && (
        <p className="rounded-lg bg-surface-2 px-3 py-2 text-sm">
          <span lang="ko" className="block font-medium">
            안녕하세요. 외국인 관광객입니다. 몇 가지 여쭤봐도 될까요?
          </span>
          <span className="block text-muted">Hello. I am a foreign tourist. May I ask a few questions?</span>
        </p>
      )}
      <ol className="space-y-2.5">
        {core.map((x, i) => (
          <Row key={x.q} x={x} i={i + 1} />
        ))}
      </ol>
      {rest.length > 0 && (
        <details>
          <summary className="inline-flex min-h-10 cursor-pointer items-center gap-1 text-sm font-medium text-brand-strong">
            {t(`질문 ${rest.length}개 더 보기`, `${rest.length} more question(s)`)} <ChevronDown aria-hidden="true" className="chev size-4" />
          </summary>
          <ol start={core.length + 1} className="mt-1 space-y-2.5">
            {rest.map((x, i) => (
              <Row key={x.q} x={x} i={core.length + i + 1} muted />
            ))}
          </ol>
        </details>
      )}
      <div className="flex flex-wrap gap-2 border-t border-line pt-3">
        <button type="button" onClick={copy} className="btn btn-outline">
          <ClipboardCopy aria-hidden="true" className="size-4" />{" "}
          {t(`질문 ${questions.length}개 복사`, `Copy ${questions.length} question(s) in Korean`)}
        </button>
        {tel ? (
          <a href={`tel:${tel.replace(/[^0-9+]/g, "")}`} className="btn btn-primary">
            <Phone aria-hidden="true" className="size-4" /> {t(`${tel} 전화하기`, `Call ${tel}`)}
          </a>
        ) : (
          <span className="self-center text-sm text-muted">
            {t("공공데이터에 전화번호가 없어 홈페이지에서 확인해야 합니다.", "No phone number in public data; check the website.")}
          </span>
        )}
      </div>
      {en && (
        <p className="text-xs text-muted">
          Calls are answered in Korean. If you need help, the Korea Travel Hotline 1330 offers interpretation.
        </p>
      )}
      <p aria-live="polite" className="text-sm font-semibold text-ok">
        {copied ? t("질문 목록을 복사했습니다.", "Copied.") : ""}
      </p>
    </section>
  );
}
