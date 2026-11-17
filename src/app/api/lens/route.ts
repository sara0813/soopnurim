import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { FOREST_ID, LENS_ITEMS } from "@/lib/reportKeys";
import { rateLimited } from "@/lib/reportStore";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * 렌즈: 방문자가 올린 사진에서 여정 항목의 단서를 AI가 '제안'만 한다.
 * - 사진은 저장하지 않고, 응답을 만든 뒤 버린다 (로그에도 남기지 않음)
 * - 제안은 이용자가 직접 확인·선택해야 제보가 된다 (이 API는 아무것도 저장하지 않음)
 */
const ENABLED = Boolean(process.env.ANTHROPIC_API_KEY);
const MAX_B64 = 2_800_000; // 약 2MB 이미지
const KEYS = LENS_ITEMS.map((i) => i.key);

export async function GET() {
  return NextResponse.json({ enabled: ENABLED });
}

const SCHEMA = {
  type: "object",
  properties: {
    photoOk: { type: "boolean" },
    note: { type: "string" },
    suggestions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          itemKey: { type: "string", enum: KEYS },
          answer: { type: "string", enum: ["yes", "no", "unsure"] },
          clue: { type: "string" },
        },
        required: ["itemKey", "answer", "clue"],
        additionalProperties: false,
      },
    },
  },
  required: ["photoOk", "note", "suggestions"],
  additionalProperties: false,
};

const SYSTEM = `당신은 자연휴양림 방문자가 올린 사진을 보고, 휠체어 이용자·어르신·영유아 동반 가족이 여행 전에 궁금해하는 항목의 '단서'를 찾아 제안하는 도우미입니다.

원칙:
- 사진에 실제로 보이는 것만 말합니다. 보이지 않거나 애매하면 answer를 "unsure"로 하거나 그 항목을 빼세요.
- "휠체어로 이용 가능하다/불가능하다" 같은 판정을 하지 않습니다. 보이는 사실만 적습니다. 예: "출입문 앞에 계단 2칸이 보임", "데크 길이며 턱은 보이지 않음".
- 사람의 얼굴·신체 특징, 차량 번호판, 이름, 연락처 등 개인을 알아볼 수 있는 내용은 절대 적지 않습니다.
- 사진이 휴양림 시설·숲길과 관련 없으면 photoOk를 false로 하고 suggestions는 빈 배열로 둡니다.
- clue는 한국어 한 문장, 40자 이내로 씁니다. note는 사진 전체에 대한 한 문장(40자 이내)입니다.
- answer의 뜻: "yes" = 그 시설·특징이 사진에 있음, "no" = 그 자리를 보여 주는데 없음, "unsure" = 보이지만 판단하기 어려움.

확인할 수 있는 항목(itemKey: 이름 - 사진에서 볼 것):
${LENS_ITEMS.map((i) => `- ${i.key}: ${i.label} - ${i.look}`).join("\n")}`;

const PII = [/01[016-9][-\s.]?\d{3,4}[-\s.]?\d{4}/, /\d{6}[-\s]?[1-4]\d{6}/, /\d{2,3}[가-힣]\s?\d{4}/, /[\w.+-]+@[\w-]+\.[\w.]+/];

export async function POST(req: Request) {
  if (!ENABLED) return NextResponse.json({ error: "렌즈가 아직 연결되지 않았습니다." }, { status: 503 });
  const ip = (req.headers.get("x-forwarded-for") ?? "local").split(",")[0].trim();
  if (rateLimited(`lens:${ip}`, 6)) return NextResponse.json({ error: "사진 분석은 10분에 6장까지 할 수 있습니다." }, { status: 429 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }
  const forestId = String(body.forestId ?? "");
  const image = String(body.image ?? "");
  if (!FOREST_ID.test(forestId)) return NextResponse.json({ error: "잘못된 휴양림입니다." }, { status: 400 });
  if (!image || image.length > MAX_B64 || !/^[A-Za-z0-9+/=]+$/.test(image))
    return NextResponse.json({ error: "사진을 읽지 못했습니다. 다른 사진으로 시도해 주세요." }, { status: 400 });

  const client = new Anthropic();
  try {
    const res = await client.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 4000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA } },
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: "image/jpeg", data: image } },
            { type: "text", text: "이 사진에서 확인할 수 있는 항목의 단서를 제안해 주세요." },
          ],
        },
      ],
    });
    if (res.stop_reason === "refusal")
      return NextResponse.json({ error: "이 사진은 분석할 수 없습니다. 다른 사진으로 시도해 주세요." }, { status: 422 });

    const text = res.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
    const out = JSON.parse(text) as {
      photoOk: boolean;
      note: string;
      suggestions: { itemKey: string; answer: string; clue: string }[];
    };
    const seen = new Set<string>();
    const suggestions = (out.photoOk ? out.suggestions : [])
      .filter((s) => KEYS.includes(s.itemKey) && ["yes", "no", "unsure"].includes(s.answer) && !seen.has(s.itemKey) && seen.add(s.itemKey))
      .map((s) => ({ ...s, clue: PII.some((re) => re.test(s.clue)) ? "" : s.clue.replace(/\s+/g, " ").trim().slice(0, 60) }));
    return NextResponse.json({ photoOk: out.photoOk, note: String(out.note ?? "").slice(0, 80), suggestions });
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError)
      return NextResponse.json({ error: "지금 이용자가 많습니다. 잠시 뒤 다시 시도해 주세요." }, { status: 429 });
    if (e instanceof Anthropic.BadRequestError)
      return NextResponse.json({ error: "사진을 분석하지 못했습니다. 다른 사진으로 시도해 주세요." }, { status: 400 });
    if (e instanceof Anthropic.APIError)
      return NextResponse.json({ error: "분석 서비스에 연결하지 못했습니다." }, { status: 502 });
    return NextResponse.json({ error: "분석 결과를 읽지 못했습니다. 다시 시도해 주세요." }, { status: 502 });
  }
}
