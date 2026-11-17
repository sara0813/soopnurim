"use client";
import { useState } from "react";
import { Send } from "lucide-react";
import type { JourneyItem } from "@/lib/types";
import { useLang } from "@/lib/useLang";

export type Answer = "yes" | "no" | "unsure";
export interface Report {
  id: string;
  itemKey: string;
  answer: Answer;
  memo: string;
  visit: string;
  createdAt: string;
  via?: "lens";
}
export const ANSWER_LABEL: Record<Answer, string> = { yes: "있었어요", no: "없었어요", unsure: "잘 모르겠어요" };
export const ANSWER_LABEL_EN: Record<Answer, string> = { yes: "It was there", no: "It wasn't", unsure: "Not sure" };

const thisMonth = () => new Date().toISOString().slice(0, 7);

export default function ReportForm({
  forestId,
  item,
  mode,
  onClose,
  onDone,
}: {
  forestId: string;
  item: JourneyItem;
  mode?: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [answer, setAnswer] = useState<Answer | "">("");
  const [memo, setMemo] = useState("");
  const [visit, setVisit] = useState(thisMonth());
  const [hp, setHp] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const name = `ans-${item.key}`;
  const { lang, t } = useLang();
  const LABELS = lang === "en" ? ANSWER_LABEL_EN : ANSWER_LABEL;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!answer) {
      setMsg(t("있었어요·없었어요·잘 모르겠어요 중 하나를 골라 주세요.", "Please choose one answer."));
      return;
    }
    setBusy(true);
    setMsg("");
    try {
      const r = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ forestId, itemKey: item.key, answer, memo, visit, website: hp }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setMsg(lang === "en" ? "Could not save your report. Please try again later." : (j.error ?? "제보를 저장하지 못했습니다. 잠시 뒤 다시 시도해 주세요."));
        return;
      }
      onDone();
    } catch {
      setMsg(t("네트워크 문제로 제보를 보내지 못했습니다.", "Network problem: the report was not sent."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3 rounded-xl border border-line bg-surface-2 p-3" aria-label={t(`${item.label} 제보`, `Report: ${item.label}`)}>
      <fieldset>
        <legend className="mb-1.5 text-sm font-semibold">
          {t(`${item.label}, 직접 가 보니 어땠나요?`, `${item.label}: what did you find?`)}
        </legend>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(LABELS) as Answer[]).map((a) => (
            <label key={a} className="chip has-[:checked]:border-ink has-[:checked]:bg-ink has-[:checked]:text-on-ink">
              <input type="radio" name={name} value={a} checked={answer === a} onChange={() => setAnswer(a)} className="sr-only" />
              {LABELS[a]}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="block">
        <span className="label">{t("한 줄 메모 (선택, 120자)", "Short note (optional, 120 characters)")}</span>
        <input
          type="text"
          value={memo}
          maxLength={120}
          onChange={(e) => setMemo(e.target.value)}
          placeholder={t("예: 객실 출입문 문턱 약 2cm, 옆에 경사판 있음", "e.g. booked without a Korean phone; paid with a foreign card")}
          className="field mt-1"
        />
      </label>
      <label className="block max-w-[14rem]">
        <span className="label">{t("방문 시기", "When did you visit?")}</span>
        <input type="month" value={visit} max={thisMonth()} onChange={(e) => setVisit(e.target.value)} className="field mt-1" />
      </label>
      {/* 자동 등록 방지용 (사람에게는 보이지 않음) */}
      <label className="hidden" aria-hidden="true">
        {t("웹사이트", "Website")}
        <input type="text" tabIndex={-1} autoComplete="off" value={hp} onChange={(e) => setHp(e.target.value)} />
      </label>
      <p className="text-xs text-muted">
        {t(
          "이름·연락처·차량번호 같은 개인정보는 적지 마세요. 제보는 공개되며, 운영기관 확인 전까지 '이용자 제보'로 따로 표시됩니다.",
          "Do not include personal details such as names, phone numbers or license plates. Reports are public and shown separately as 'Visitor report'.",
        )}
        {mode === "memory" && t(" (현재 시연 모드: 서버가 다시 시작되면 제보가 사라집니다.)", " (Demo mode: reports disappear when the server restarts.)")}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>
          <Send aria-hidden="true" className="size-4" /> {busy ? t("보내는 중…", "Sending…") : t("제보 올리기", "Submit")}
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
          {t("취소", "Cancel")}
        </button>
        <span role="status" className="text-sm text-no">
          {msg}
        </span>
      </div>
    </form>
  );
}
