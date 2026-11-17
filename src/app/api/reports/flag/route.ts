import { NextResponse } from "next/server";
import { FOREST_ID } from "@/lib/reportKeys";
import { FLAG_HIDE_AT, FLAG_RETENTION_DAYS, flagReport, flagSalt, rateLimited, visitorKey } from "@/lib/reportStore";

export const dynamic = "force-dynamic";

/**
 * 신고: 서로 다른 이용자 FLAG_HIDE_AT명이 신고하면 자동으로 숨김.
 * 같은 이용자(접속 주소의 솔트 해시)가 같은 제보를 여러 번 신고해도 한 번만 센다.
 * 원래 주소는 저장하지 않고, 해시도 FLAG_RETENTION_DAYS일 뒤 지운다.
 * 중복 확인과 신고 수 증가는 저장소에서 한 번에(원자적으로) 처리한다.
 */
export async function POST(req: Request) {
  const salt = flagSalt();
  if (!salt) return NextResponse.json({ error: "지금은 신고를 받을 수 없어요." }, { status: 503 });
  const ip = (req.headers.get("x-forwarded-for") ?? "local").split(",")[0].trim();
  if (rateLimited("flag:" + ip, 20)) return NextResponse.json({ error: "잠시 뒤 다시 시도해 주세요." }, { status: 429 });
  const { forestId = "", id = "" } = await req.json().catch(() => ({}));
  if (!FOREST_ID.test(forestId) || typeof id !== "string" || !id || id.length > 64)
    return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
  try {
    const res = await flagReport(forestId, id, await visitorKey(ip, salt));
    if (res === "missing") return NextResponse.json({ error: "없는 제보" }, { status: 404 });
    return NextResponse.json({ ok: true, already: res === "already", hideAt: FLAG_HIDE_AT, retentionDays: FLAG_RETENTION_DAYS });
  } catch {
    return NextResponse.json({ error: "신고를 저장하지 못했어요." }, { status: 503 });
  }
}
