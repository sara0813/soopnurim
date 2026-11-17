import { NextResponse } from "next/server";
import { FOREST_ID } from "@/lib/reportKeys";
import { setHidden } from "@/lib/reportStore";

export const dynamic = "force-dynamic";

/**
 * 관리자 숨김/복구. 환경변수 ADMIN_TOKEN이 있어야 동작.
 * curl -X POST /api/reports/hide -H "Authorization: Bearer <ADMIN_TOKEN>" -d '{"forestId":"n000","id":"...","hidden":true}'
 */
export async function POST(req: Request) {
  const token = process.env.ADMIN_TOKEN;
  if (!token || req.headers.get("authorization") !== `Bearer ${token}`)
    return NextResponse.json({ error: "권한 없음" }, { status: 401 });
  const { forestId = "", id = "", hidden = true } = await req.json().catch(() => ({}));
  if (!FOREST_ID.test(forestId)) return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
  if (!(await setHidden(forestId, String(id), Boolean(hidden)))) return NextResponse.json({ error: "없는 제보" }, { status: 404 });
  return NextResponse.json({ ok: true, hidden: Boolean(hidden) });
}
