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
import ReportForm, { ANSWER_LABEL, type Report } from "./ReportForm";
import LensPanel from "./LensPanel";
import { STEPS } from "@/lib/groups";
import { useGroups } from "@/lib/useGroups";
import type { Group, JourneyItem, Status } from "@/lib/types";

const STATUS: Record<Status, { icon: typeof CircleCheck; label: string }> = {
  ok: { icon: CircleCheck, label: "확인됨" },
  warn: { icon: TriangleAlert, label: "추가 확인 필요" },
  no: { icon: CircleX, label: "없음" },
  unknown: { icon: CircleDashed, label: "빈칸" },
};

const SRC = {
  public: { label: "공공데이터", cls: "src-public" },
  operator: { label: "운영자 확인", cls: "src-operator" },
  user: { label: "이용자 제보", cls: "src-user" },
};

type ReportState = { mode: string; reports: Report[] } | null;

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
  const rel = useMemo(
    () => (groups.length ? items.filter((it) => it.groups.some((g) => groups.includes(g))) : items),
    [items, groups],
  );
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
  const order = (groups.length ? groups : (["wheelchair", "elder", "child"] as Group[])).flatMap((g) => coreKeys[g]);
  const rank = (k: string) => {
    const i = order.indexOf(k);
    return i === -1 ? 99 : i;
  };
  const questions = [...askable].sort((a, b) => rank(a.key) - rank(b.key)).map((i) => i.question);

  return (
    <div className="space-y-4">
      <div className="card space-y-4 p-4 sm:p-5">
        <GroupPicker compact />
        {!groups.length && <p className="text-sm text-muted">유형을 고르면 그 유형에 필요한 항목만 보여드립니다.</p>}
        <CoverageBar known={known} total={rel.length} size="lg" />
        <Legend />
      </div>

      {rs?.mode === "error" && (
        <p role="status" className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-line bg-surface px-4 py-3 text-sm">
          <span className="text-muted">이용자 제보를 불러오지 못했습니다. 공공데이터 정보는 그대로 볼 수 있습니다.</span>
          <button type="button" className="font-semibold text-brand-strong underline underline-offset-2" onClick={load}>
            다시 시도
          </button>
        </p>
      )}
      {rs && rs.mode !== "error" && <LensPanel forestId={forestId} onDone={load} />}

      <ol className="space-y-3">
        {STEPS.map((s) => {
          const its = rel.filter((i) => i.step === s.step);
          if (!its.length) return null;
          const filled = its.filter((i) => i.status !== "unknown");
          const blank = its.filter((i) => i.status === "unknown");
          const repN = its.reduce((n, i) => n + (byItem.get(i.key)?.length ?? 0), 0);
          return (
            <li key={s.step} className="card overflow-hidden">
              <h3 className="flex items-center gap-3 border-b border-line bg-surface-2 px-4 py-3">
                <span
                  aria-hidden="true"
                  className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-strong text-sm font-bold text-white"
                >
                  {s.step}
                </span>
                <span className="text-lg font-bold">{s.title}</span>
                <span className="ml-auto text-xs text-muted">
                  확인 {filled.length} · 빈칸 {blank.length}
                  {repN > 0 && ` · 제보 ${repN}`}
                </span>
              </h3>
              <div className="px-4">
                {filled.length > 0 && (
                  <ul className="divide-y divide-line">
                    {filled.map((it) => (
                      <ItemRow key={it.key} it={it} reports={byItem.get(it.key)} forestId={forestId} onDone={load} mode={rs?.mode} />
                    ))}
                  </ul>
                )}
                {blank.length > 0 && (
                  <details className={`${filled.length ? "border-t border-line" : ""}`} open={filled.length === 0 && blank.length <= 2}>
                    <summary className="flex min-h-12 cursor-pointer items-center gap-2 py-2 text-sm">
                      <CircleDashed aria-hidden="true" className="size-4 shrink-0 text-blank" />
                      <span className="font-semibold">빈칸 {blank.length}개</span>
                      <span className="min-w-0 truncate text-muted">{blank.map((b) => b.label).join(", ")}</span>
                      <ChevronDown aria-hidden="true" className="chev ml-auto size-4 shrink-0 text-muted" />
                    </summary>
                    <ul className="divide-y divide-line border-t border-dashed border-line">
                      {blank.map((it) => (
                        <ItemRow key={it.key} it={it} reports={byItem.get(it.key)} forestId={forestId} onDone={load} mode={rs?.mode} />
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      <PhoneQuestions questions={questions} tel={tel} forestName={forestName} />
    </div>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1.5 border-t border-line pt-3 text-xs text-muted">
      <span className="font-semibold">출처 표시</span>
      <span className="src src-public">공공데이터</span>
      <span className="src src-operator">운영자 확인</span>
      <span className="src src-user">이용자 제보</span>
      <span className="src src-web">온라인 자료 참고</span>
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
  const [open, setOpen] = useState(false);
  const canReport =
    it.key !== "contact" && it.key !== "stay" && (it.status === "unknown" || it.status === "warn") && mode !== "error" && mode !== undefined;
  return (
    <li className="py-3.5">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <strong className="font-semibold">{it.label}</strong>
        <span className={`st st-${it.status}`}>
          <st.icon aria-hidden="true" className="size-4" strokeWidth={2.25} />
          {st.label}
        </span>
      </div>
      {it.value && <p className="mt-1 text-[0.95rem]">{it.value}</p>}
      {it.source ? (
        <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
          <span className={`src ${SRC[it.source].cls}`}>{SRC[it.source].label}</span>
          {it.sourceUrl ? (
            <a href={it.sourceUrl} target="_blank" rel="noreferrer" className="underline underline-offset-2">
              {it.sourceLabel}
            </a>
          ) : (
            <span>{it.sourceLabel}</span>
          )}
          {it.sourceDate && <span>· 기준일 {it.sourceDate}</span>}
        </p>
      ) : it.sourceUrl ? (
        <p className="mt-1 text-xs">
          <a href={it.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-brand-strong underline underline-offset-2">
            참고 자료 열기 <ExternalLink aria-hidden="true" className="size-3" />
          </a>
        </p>
      ) : (
        it.status === "unknown" && !it.value && <p className="mt-1 text-sm text-muted">공공데이터에 이 정보가 없습니다.</p>
      )}

      {it.web && it.web.length > 0 && (
        <ul className="mt-2 space-y-1.5">
          {it.web.map((w) => (
            <li key={w.url} className="rounded-lg border border-line px-3 py-2 text-sm">
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
                <span className="src src-web">{w.kind === "official" ? "운영기관 공개자료" : "온라인 후기 참고"}</span>
                <span>미확인 · 게시 {w.date}</span>
              </p>
              <p className="mt-1">{w.summary}</p>
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
              {it.status === "unknown" ? "다녀왔다면 이 빈칸 제보하기" : "다녀온 경험 제보하기"}
            </button>
          )}
        </div>
      )}
    </li>
  );
}

function ReportSummary({ reports, forestId, onDone }: { reports: Report[]; forestId: string; onDone: () => void }) {
  const [flagged, setFlagged] = useState<string[]>([]);
  const count = (a: Report["answer"]) => reports.filter((r) => r.answer === a).length;
  const flag = async (id: string) => {
    if (!confirm("이 제보를 부적절한 내용으로 신고할까요? 신고가 3번 쌓이면 자동으로 숨겨집니다.")) return;
    try {
      await fetch("/api/reports/flag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ forestId, id }),
      });
      setFlagged((f) => [...f, id]);
      onDone();
    } catch {
      /* 무시 */
    }
  };
  return (
    <div className="mt-2 rounded-lg border border-[var(--src-user)]/30 bg-[color-mix(in_srgb,var(--src-user)_6%,var(--surface))] px-3 py-2">
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
        <span className="src src-user">이용자 제보 {reports.length}건</span>
        <span className="text-muted">
          있었어요 {count("yes")} · 없었어요 {count("no")} · 잘 모름 {count("unsure")}
        </span>
      </p>
      <ul className="mt-1 divide-y divide-line">
        {reports.slice(0, 5).map((r) => (
          <li key={r.id} className="flex items-start gap-2 py-1.5 text-sm">
            <span className="min-w-0 flex-1">
              <span className="font-semibold">{ANSWER_LABEL[r.answer]}</span>
              {r.memo && <> – {r.memo}</>}
              {r.via === "lens" && <span className="ml-1.5 align-middle text-xs text-muted">(사진 보고 확인)</span>}
              <span className="block text-xs text-muted">
                {r.visit ? `${r.visit} 방문` : "방문 시기 미기재"} · 제보{" "}
                {new Date(r.createdAt).toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" })}
              </span>
            </span>
            <button
              type="button"
              onClick={() => flag(r.id)}
              disabled={flagged.includes(r.id)}
              className="inline-flex min-h-8 shrink-0 items-center gap-1 rounded px-1 text-xs text-muted hover:text-fg disabled:opacity-50"
              aria-label="이 제보 신고"
            >
              <Flag aria-hidden="true" className="size-3.5" />
              {flagged.includes(r.id) ? "신고됨" : "신고"}
            </button>
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted">제보는 운영기관이나 숲누림이 확인한 정보가 아닙니다. 방문 시기를 함께 보세요.</p>
    </div>
  );
}

function PhoneQuestions({ questions, tel, forestName }: { questions: string[]; tel: string; forestName: string }) {
  const [copied, setCopied] = useState(false);
  const core = questions.slice(0, 5);
  const rest = questions.slice(5);
  const text = `[${forestName} 문의 질문]\n` + questions.map((q, i) => `${i + 1}. ${q}`).join("\n");
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
  return (
    <section id="ask" aria-labelledby="phone-h" className="card scroll-mt-20 space-y-3 p-4 sm:p-5">
      <div>
        <h3 id="phone-h" className="text-lg font-bold">
          운영기관에 전화로 물어볼 질문
        </h3>
        <p className="text-sm text-muted">빈칸을 질문으로 바꿨습니다. 선택한 이용자 유형에 중요한 질문부터 정렬했어요.</p>
      </div>
      <ol className="space-y-2">
        {core.map((q, i) => (
          <li key={q} className="flex gap-3">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-bold text-brand-strong">
              {i + 1}
            </span>
            <span>{q}</span>
          </li>
        ))}
      </ol>
      {rest.length > 0 && (
        <details>
          <summary className="inline-flex min-h-10 cursor-pointer items-center gap-1 text-sm font-medium text-brand-strong">
            질문 {rest.length}개 더 보기 <ChevronDown aria-hidden="true" className="chev size-4" />
          </summary>
          <ol start={core.length + 1} className="mt-1 space-y-2">
            {rest.map((q, i) => (
              <li key={q} className="flex gap-3">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-surface-2 text-xs font-bold text-muted">
                  {core.length + i + 1}
                </span>
                <span>{q}</span>
              </li>
            ))}
          </ol>
        </details>
      )}
      <div className="flex flex-wrap gap-2 border-t border-line pt-3">
        <button type="button" onClick={copy} className="btn btn-outline">
          <ClipboardCopy aria-hidden="true" className="size-4" /> 질문 {questions.length}개 복사
        </button>
        {tel ? (
          <a href={`tel:${tel.replace(/[^0-9+]/g, "")}`} className="btn btn-primary">
            <Phone aria-hidden="true" className="size-4" /> {tel} 전화하기
          </a>
        ) : (
          <span className="self-center text-sm text-muted">공공데이터에 전화번호가 없어 홈페이지에서 확인해야 합니다.</span>
        )}
      </div>
      <p aria-live="polite" className="text-sm font-semibold text-ok">
        {copied ? "질문 목록을 복사했습니다." : ""}
      </p>
    </section>
  );
}
