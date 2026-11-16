"use client";
import { useMemo, useState } from "react";
import CoverageBar from "./CoverageBar";
import GroupPicker from "./GroupPicker";
import { STEPS } from "@/lib/groups";
import { useGroups } from "@/lib/useGroups";
import type { JourneyItem, Status } from "@/lib/types";

const STATUS: Record<Status, { icon: string; label: string; cls: string }> = {
  ok: { icon: "✅", label: "확인됨", cls: "src-public" },
  warn: { icon: "⚠️", label: "주의·추가 확인", cls: "st-warn" },
  no: { icon: "❌", label: "없음", cls: "st-no" },
  unknown: { icon: "⚪", label: "빈칸", cls: "src-blank" },
};

const SRC = {
  public: { label: "공공데이터", cls: "src-public" },
  operator: { label: "운영자 확인", cls: "src-operator" },
  user: { label: "이용자 제보", cls: "src-user" },
};

export default function JourneyView({ items, tel, forestName }: { items: JourneyItem[]; tel: string; forestName: string }) {
  const { groups } = useGroups();
  const rel = useMemo(
    () => (groups.length ? items.filter((it) => it.groups.some((g) => groups.includes(g))) : items),
    [items, groups],
  );
  const known = rel.filter((i) => i.status !== "unknown").length;
  const blanks = rel.filter((i) => i.status === "unknown" || i.status === "warn").filter((i) => i.question);

  return (
    <div className="space-y-6">
      <div className="card space-y-4 p-4">
        <GroupPicker compact />
        {!groups.length && (
          <p className="text-sm text-muted">유형을 고르지 않으면 모든 항목을 보여드립니다.</p>
        )}
        <CoverageBar known={known} total={rel.length} size="lg" />
      </div>

      <section aria-labelledby="journey-h">
        <h2 id="journey-h" className="mb-3 text-2xl font-extrabold">
          여정 단계별 확인 항목
        </h2>
        <ol className="space-y-4">
          {STEPS.map((s) => {
            const its = rel.filter((i) => i.step === s.step);
            if (!its.length) return null;
            return (
              <li key={s.step} className="card p-4">
                <h3 className="mb-2 flex items-baseline gap-2 text-xl font-extrabold">
                  <span
                    aria-hidden="true"
                    className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-strong text-white"
                  >
                    {s.step}
                  </span>
                  {s.title} <span className="text-base font-normal text-muted">{s.desc}</span>
                </h3>
                <ul className="divide-y divide-line">
                  {its.map((it) => {
                    const st = STATUS[it.status];
                    return (
                      <li key={it.key} className="py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`badge ${st.cls}`}>
                            <span aria-hidden="true">{st.icon}</span> {st.label}
                          </span>
                          <strong className="text-lg">{it.label}</strong>
                        </div>
                        {it.value && <p className="mt-1">{it.value}</p>}
                        {it.source ? (
                          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
                            <span className={`badge ${SRC[it.source].cls}`}>{SRC[it.source].label}</span>
                            {it.sourceUrl ? (
                              <a href={it.sourceUrl} target="_blank" rel="noreferrer" className="underline">
                                {it.sourceLabel}
                              </a>
                            ) : (
                              <span>{it.sourceLabel}</span>
                            )}
                            {it.sourceDate && <span>· 기준일 {it.sourceDate}</span>}
                          </p>
                        ) : (
                          it.status === "unknown" && (
                            <p className="mt-1 text-sm text-muted">공공데이터에 이 정보가 없습니다. 아래 질문 목록으로 확인해 보세요.</p>
                          )
                        )}
                      </li>
                    );
                  })}
                </ul>
              </li>
            );
          })}
        </ol>
      </section>

      <PhoneQuestions questions={blanks.map((b) => b.question)} tel={tel} forestName={forestName} />
    </div>
  );
}

function PhoneQuestions({ questions, tel, forestName }: { questions: string[]; tel: string; forestName: string }) {
  const [copied, setCopied] = useState(false);
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
    <section aria-labelledby="phone-h" className="card space-y-3 border-2 border-[var(--src-operator)] p-4">
      <h2 id="phone-h" className="text-2xl font-extrabold">
        📞 전화로 물어보기 <span className="text-base font-normal text-muted">빈칸·주의 항목 {questions.length}개</span>
      </h2>
      <p className="text-muted">빈칸을 질문으로 바꿔 두었습니다. 복사해서 메모해 두고 전화할 때 차례로 물어보세요.</p>
      <ol className="list-decimal space-y-1 pl-6">
        {questions.map((q) => (
          <li key={q}>{q}</li>
        ))}
      </ol>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={copy} className="btn btn-outline">
          📋 질문 목록 복사
        </button>
        {tel ? (
          <a href={`tel:${tel.replace(/[^0-9+]/g, "")}`} className="btn btn-primary">
            📞 {tel} 전화하기
          </a>
        ) : (
          <span className="self-center text-sm text-muted">공공데이터에 전화번호가 없어 홈페이지에서 확인해야 합니다.</span>
        )}
      </div>
      <p aria-live="polite" className="text-sm font-bold text-[var(--src-public)]">
        {copied ? "질문 목록을 복사했습니다." : ""}
      </p>
    </section>
  );
}
