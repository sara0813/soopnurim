"use client";
import { useState } from "react";
import { Send } from "lucide-react";
import type { JourneyItem } from "@/lib/types";

export type Answer = "yes" | "no" | "unsure";
export interface Report {
  id: string;
  itemKey: string;
  answer: Answer;
  memo: string;
  visit: string;
  createdAt: string;
}
export const ANSWER_LABEL: Record<Answer, string> = { yes: "있었어요", no: "없었어요", unsure: "잘 모르겠어요" };

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

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!answer) {
      setMsg("있었어요·없었어요·잘 모르겠어요 중 하나를 골라 주세요.");
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
        setMsg(j.error ?? "제보를 저장하지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
        return;
      }
      onDone();
    } catch {
      setMsg("네트워크 문제로 제보를 보내지 못했습니다.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3 rounded-xl border border-line bg-surface-2 p-3" aria-label={`${item.label} 제보`}>
      <fieldset>
        <legend className="mb-1.5 text-sm font-semibold">
          {item.label}, 직접 가 보니 어땠나요?
        </legend>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(ANSWER_LABEL) as Answer[]).map((a) => (
            <label key={a} className="chip has-[:checked]:border-brand-strong has-[:checked]:bg-brand-strong has-[:checked]:text-white">
              <input type="radio" name={name} value={a} checked={answer === a} onChange={() => setAnswer(a)} className="sr-only" />
              {ANSWER_LABEL[a]}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="block">
        <span className="label">한 줄 메모 (선택, 120자)</span>
        <input
          type="text"
          value={memo}
          maxLength={120}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="예: 객실 출입문 문턱 약 2cm, 옆에 경사판 있음"
          className="field mt-1"
        />
      </label>
      <label className="block max-w-[14rem]">
        <span className="label">방문 시기</span>
        <input type="month" value={visit} max={thisMonth()} onChange={(e) => setVisit(e.target.value)} className="field mt-1" />
      </label>
      {/* 자동 등록 방지용 (사람에게는 보이지 않음) */}
      <label className="hidden" aria-hidden="true">
        웹사이트
        <input type="text" tabIndex={-1} autoComplete="off" value={hp} onChange={(e) => setHp(e.target.value)} />
      </label>
      <p className="text-xs text-muted">
        이름·연락처·차량번호 같은 개인정보는 적지 마세요. 제보는 공개되며, 운영기관 확인 전까지 &lsquo;이용자 제보&rsquo;로 따로
        표시됩니다.
        {mode === "memory" && " (현재 시연 모드: 서버가 다시 시작되면 제보가 사라집니다.)"}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>
          <Send aria-hidden="true" className="size-4" /> {busy ? "보내는 중…" : "제보 올리기"}
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
          취소
        </button>
        <span role="status" className="text-sm text-no">
          {msg}
        </span>
      </div>
    </form>
  );
}
