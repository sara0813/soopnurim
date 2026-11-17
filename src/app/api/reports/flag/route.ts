import { NextResponse } from "next/server";
import { FOREST_ID } from "@/lib/reportKeys";
import { getReport, putReport, rateLimited, visitorKey } from "@/lib/reportStore";

export const dynamic = "force-dynamic";

/**
 * 신고: 서로 다른 이용자 3명이 신고하면 자동으로 숨김.
 * 같은 이용자(접속 주소 해시)가 같은 제보를 여러 번 신고해도 한 번만 센다. 원래 주소는 저장하지 않는다.
 */
export async function POST(req: Request) {
  const ip = (req.headers.get("x-forwarded-for") ?? "local").split(",")[0].trim();
  if (rateLimited("flag:" + ip, 20)) return NextResponse.json({ error: "잠시 뒤 다시 시도해 주세요." }, { status: 429 });
  const { forestId = "", id = "" } = await req.json().catch(() => ({}));
  if (!FOREST_ID.test(forestId) || typeof id !== "string" || !id) return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
  const r = await getReport(forestId, id);
  if (!r) return NextResponse.json({ error: "없는 제보" }, { status: 404 });
  const who = await visitorKey(ip);
  const by = r.flaggedBy ?? [];
  if (by.includes(who)) return NextResponse.json({ ok: true, already: true });
  r.flaggedBy = [...by, who];
  r.flags += 1;
  if (r.flags >= 3) r.hidden = true;
  await putReport(r);
  return NextResponse.json({ ok: true });
}
