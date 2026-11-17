import { NextResponse } from "next/server";
import { FOREST_ID, ITEM_KEYS } from "@/lib/reportKeys";
import { MODE, listReports, putReport, rateLimited } from "@/lib/reportStore";

export const dynamic = "force-dynamic";

const PUBLIC_FIELDS = ["id", "itemKey", "answer", "memo", "visit", "createdAt", "via"] as const;

export async function GET(req: Request) {
  const forest = new URL(req.url).searchParams.get("forest") ?? "";
  if (!FOREST_ID.test(forest)) return NextResponse.json({ error: "잘못된 휴양림입니다." }, { status: 400 });
  try {
    const reports = (await listReports(forest))
      .filter((r) => !r.hidden)
      .map((r) => Object.fromEntries(PUBLIC_FIELDS.map((k) => [k, r[k]])));
    return NextResponse.json({ mode: MODE, reports });
  } catch {
    return NextResponse.json({ mode: "error", reports: [] }, { status: 503 });
  }
}

// 연락처·주민번호·차량번호처럼 보이는 문자열은 받지 않는다
const PII = [/01[016-9][-\s.]?\d{3,4}[-\s.]?\d{4}/, /\d{6}[-\s]?[1-4]\d{6}/, /\d{2,3}[가-힣]\s?\d{4}/, /[\w.+-]+@[\w-]+\.[\w.]+/];

export async function POST(req: Request) {
  const ip = (req.headers.get("x-forwarded-for") ?? "local").split(",")[0].trim();
  if (rateLimited(ip)) return NextResponse.json({ error: "잠시 뒤 다시 시도해 주세요." }, { status: 429 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }
  // 자동 등록 방지 필드가 채워져 있으면 저장하지 않고 성공처럼 응답
  if (body.website) return NextResponse.json({ ok: true });

  const forestId = String(body.forestId ?? "");
  const itemKey = String(body.itemKey ?? "");
  const answer = String(body.answer ?? "");
  const memo = String(body.memo ?? "").replace(/\s+/g, " ").trim().slice(0, 120);
  const visit = String(body.visit ?? "");
  const via = body.via === "lens" ? ("lens" as const) : undefined;

  if (!FOREST_ID.test(forestId) || !ITEM_KEYS.includes(itemKey))
    return NextResponse.json({ error: "제보 항목이 올바르지 않습니다." }, { status: 400 });
  if (!["yes", "no", "unsure"].includes(answer))
    return NextResponse.json({ error: "있었어요·없었어요·잘 모르겠어요 중 하나를 골라 주세요." }, { status: 400 });
  if (visit && !/^20\d{2}-(0[1-9]|1[0-2])$/.test(visit))
    return NextResponse.json({ error: "방문 시기를 연·월로 입력해 주세요." }, { status: 400 });
  const kstMonth = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 7);
  if (visit && visit > kstMonth)
    return NextResponse.json({ error: "방문 시기는 이번 달까지만 고를 수 있습니다." }, { status: 400 });
  if (PII.some((re) => re.test(memo)))
    return NextResponse.json({ error: "메모에 전화번호·이메일·차량번호 같은 개인정보는 넣을 수 없습니다." }, { status: 400 });

  const r = {
    id: crypto.randomUUID().slice(0, 12),
    forestId,
    itemKey,
    answer: answer as "yes" | "no" | "unsure",
    memo,
    visit,
    createdAt: new Date().toISOString(),
    flags: 0,
    hidden: false,
    ...(via ? { via } : {}),
  };
  try {
    await putReport(r);
  } catch {
    return NextResponse.json({ error: "제보 저장소에 연결하지 못했습니다." }, { status: 503 });
  }
  return NextResponse.json({ ok: true, id: r.id, mode: MODE });
}
