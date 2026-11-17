"use client";
import { useEffect, useRef, useState } from "react";
import { Camera, ImagePlus, Loader2, ScanSearch, Send, X } from "lucide-react";
import { LENS_ITEMS } from "@/lib/reportKeys";
import { ANSWER_LABEL, type Answer } from "./ReportForm";

type Suggestion = { itemKey: string; answer: Answer; clue: string };
type Pick = { on: boolean; answer: Answer; memo: string };

const LABEL = Object.fromEntries(LENS_ITEMS.map((i) => [i.key, i.label]));
const AI_SAYS: Record<Answer, string> = { yes: "있어 보임", no: "없어 보임", unsure: "판단 어려움" };
const thisMonth = () => new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 7);

/** 사진을 긴 변 1280px JPEG로 다시 그린다. 다시 그리면 위치정보(EXIF) 등 메타데이터가 모두 빠진다. */
async function toJpegBase64(file: File): Promise<string> {
  const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, 1280 / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close();
  const url = canvas.toDataURL("image/jpeg", 0.82);
  return url.slice(url.indexOf(",") + 1);
}

export default function LensPanel({ forestId, onDone }: { forestId: string; onDone: () => void }) {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState("");
  const [busy, setBusy] = useState<"" | "scan" | "send">("");
  const [msg, setMsg] = useState("");
  const [note, setNote] = useState("");
  const [sugs, setSugs] = useState<Suggestion[] | null>(null);
  const [picks, setPicks] = useState<Record<string, Pick>>({});
  const [visit, setVisit] = useState(thisMonth());
  const [sent, setSent] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/lens")
      .then((r) => r.json())
      .then((j) => setEnabled(Boolean(j.enabled)))
      .catch(() => setEnabled(false));
  }, []);
  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);

  const reset = () => {
    setPreview("");
    setSugs(null);
    setPicks({});
    setNote("");
    setMsg("");
    if (fileRef.current) fileRef.current.value = "";
  };

  const onFile = async (file?: File) => {
    if (!file) return;
    reset();
    setSent(0);
    setPreview(URL.createObjectURL(file));
    setBusy("scan");
    try {
      const image = await toJpegBase64(file);
      const r = await fetch("/api/lens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ forestId, image }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setMsg(j.error ?? "사진을 분석하지 못했습니다.");
        return;
      }
      const list: Suggestion[] = j.suggestions ?? [];
      setNote(j.note ?? "");
      setSugs(list);
      setPicks(Object.fromEntries(list.map((s) => [s.itemKey, { on: false, answer: s.answer, memo: s.clue }])));
      if (!j.photoOk) setMsg("휴양림 시설이나 숲길이 잘 보이는 사진으로 다시 시도해 주세요.");
      else if (!list.length) setMsg("이 사진에서는 확인할 수 있는 단서를 찾지 못했습니다.");
    } catch {
      setMsg("사진을 읽지 못했습니다. 다른 사진으로 시도해 주세요.");
    } finally {
      setBusy("");
    }
  };

  const chosen = Object.entries(picks).filter(([, p]) => p.on);
  const submit = async () => {
    if (!chosen.length) return;
    setBusy("send");
    setMsg("");
    let ok = 0;
    for (const [itemKey, p] of chosen) {
      try {
        const r = await fetch("/api/reports", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ forestId, itemKey, answer: p.answer, memo: p.memo, visit, via: "lens" }),
        });
        if (r.ok) ok++;
        else {
          const j = await r.json().catch(() => ({}));
          setMsg(`${LABEL[itemKey]}: ${j.error ?? "저장하지 못했습니다."}`);
        }
      } catch {
        setMsg("네트워크 문제로 일부 제보를 보내지 못했습니다.");
      }
    }
    setBusy("");
    if (ok) {
      setSent(ok);
      reset();
      onDone();
    }
  };

  // 분석 기능이 꺼져 있으면(API 키 없음) 패널 자체를 보이지 않는다
  if (!enabled) return null;

  return (
    <div className="card p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-strong">
          <ScanSearch className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-bold">사진으로 빈칸 채우기</h3>
          <p className="text-sm text-muted">
            다녀온 곳 사진을 올리면 AI가 문턱, 경사로, 손잡이 같은 단서를 찾아 제안합니다. 맞는 것만 골라 제보하세요.
          </p>
        </div>
      </div>

      {!open ? (
        <button type="button" className="btn btn-outline mt-3 w-full sm:w-auto" onClick={() => setOpen(true)}>
          <Camera aria-hidden="true" className="size-4" /> 사진 올리기
        </button>
      ) : (
        <div className="mt-3 space-y-3">
          <ul className="space-y-1 text-xs text-muted">
            <li>사진은 분석에만 쓰고 저장하지 않습니다. 올리기 전에 위치정보(EXIF)를 지웁니다.</li>
            <li>사람 얼굴이나 차량 번호판이 나오지 않게 찍어 주세요.</li>
            <li>AI 제안은 틀릴 수 있습니다. 직접 본 것과 맞는 항목만 고르세요.</li>
          </ul>

          <label className="btn btn-primary w-full cursor-pointer sm:w-auto">
            <ImagePlus aria-hidden="true" className="size-4" />
            {preview ? "다른 사진 고르기" : "사진 고르기"}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => onFile(e.target.files?.[0])}
              disabled={busy !== ""}
            />
          </label>

          {preview && (
            <div className="flex items-start gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="올린 사진 미리보기" className="size-24 shrink-0 rounded-lg border border-line object-cover" />
              <div className="min-w-0 flex-1 text-sm">
                {busy === "scan" ? (
                  <p className="flex items-center gap-2 text-muted" role="status">
                    <Loader2 aria-hidden="true" className="size-4 animate-spin" /> 사진에서 단서를 찾고 있습니다
                  </p>
                ) : (
                  note && <p className="text-muted">{note}</p>
                )}
                <button type="button" onClick={reset} className="mt-1 inline-flex min-h-9 items-center gap-1 text-xs text-muted hover:text-fg">
                  <X aria-hidden="true" className="size-3.5" /> 사진 지우기
                </button>
              </div>
            </div>
          )}

          {sugs && sugs.length > 0 && (
            <fieldset className="space-y-2">
              <legend className="mb-1 text-sm font-semibold">AI 제안 {sugs.length}건 · 직접 본 것과 맞는 항목만 고르세요</legend>
              {sugs.map((s) => {
                const p = picks[s.itemKey];
                const set = (v: Partial<Pick>) => setPicks((all) => ({ ...all, [s.itemKey]: { ...all[s.itemKey], ...v } }));
                return (
                  <div key={s.itemKey} className={`rounded-xl border p-3 ${p.on ? "border-brand-strong bg-brand-soft/40" : "border-line bg-surface-2"}`}>
                    <label className="flex min-h-9 cursor-pointer items-start gap-2">
                      <input type="checkbox" checked={p.on} onChange={(e) => set({ on: e.target.checked })} className="mt-1 size-4 accent-[var(--brand-strong)]" />
                      <span className="min-w-0 flex-1">
                        <span className="font-semibold">{LABEL[s.itemKey]}</span>
                        <span className="src src-web ml-2 align-middle">AI 제안 · {AI_SAYS[s.answer]}</span>
                        {s.clue && <span className="mt-0.5 block text-sm text-muted">{s.clue}</span>}
                      </span>
                    </label>
                    {p.on && (
                      <div className="mt-2 space-y-2 pl-6">
                        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={`${LABEL[s.itemKey]} 직접 확인한 결과`}>
                          {(Object.keys(ANSWER_LABEL) as Answer[]).map((a) => (
                            <button key={a} type="button" className="chip" aria-pressed={p.answer === a} onClick={() => set({ answer: a })}>
                              {ANSWER_LABEL[a]}
                            </button>
                          ))}
                        </div>
                        <input
                          className="field w-full"
                          value={p.memo}
                          maxLength={120}
                          onChange={(e) => set({ memo: e.target.value })}
                          aria-label={`${LABEL[s.itemKey]} 한 줄 메모`}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
              <label className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-semibold">방문 시기</span>
                <input type="month" className="field" value={visit} max={thisMonth()} onChange={(e) => setVisit(e.target.value)} />
              </label>
              <button type="button" className="btn btn-primary w-full sm:w-auto" disabled={!chosen.length || busy !== ""} onClick={submit}>
                {busy === "send" ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : <Send aria-hidden="true" className="size-4" />}
                {chosen.length ? `고른 ${chosen.length}건 제보하기` : "제보할 항목을 고르세요"}
              </button>
            </fieldset>
          )}

          {msg && (
            <p className="text-sm text-[var(--warn)]" role="alert">
              {msg}
            </p>
          )}
          {sent > 0 && (
            <p className="text-sm font-semibold text-brand-strong" role="status">
              {sent}건을 제보했습니다. 아래 여정 항목에서 볼 수 있습니다.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
