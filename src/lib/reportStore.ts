/**
 * 이용자 제보 저장소.
 * - Upstash Redis(REST) 환경변수가 있으면 그곳에 저장 (Vercel → Storage → Upstash 연결 시 자동 주입)
 * - 없으면 개발 중에는 로컬 파일(.data/reports.json), 배포 환경에서는 메모리(시연 모드)
 * 휴양림마다 해시 하나: key = soopnurim:reports:{forestId}, field = 제보 id, value = JSON
 */
import { promises as fs } from "fs";
import path from "path";

export interface StoredReport {
  id: string;
  forestId: string;
  itemKey: string;
  answer: "yes" | "no" | "unsure";
  memo: string;
  visit: string;
  createdAt: string;
  flags: number;
  hidden: boolean;
  /** "lens" = 사진을 보고 AI 제안을 이용자가 확인해 남긴 제보 */
  via?: "lens";
  /** (이전 형식) 신고한 이용자 해시. 지금은 별도 키에 보관 기간을 두고 저장하며, 다음 신고 때 옮긴다 */
  flaggedBy?: string[];
}

/** 신고자 해시를 보관하는 기간. 지나면 지워지고, 그 뒤 같은 사람이 다시 신고하면 한 번 더 센다 */
export const FLAG_RETENTION_DAYS = 90;
const FLAG_TTL = FLAG_RETENTION_DAYS * 24 * 60 * 60;
/** 신고가 이만큼 쌓이면 자동으로 숨긴다 */
export const FLAG_HIDE_AT = 3;

const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "";
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "";
export const MODE: "redis" | "file" | "memory" = URL_ && TOKEN ? "redis" : process.env.NODE_ENV === "production" ? "memory" : "file";

const KEY = (forestId: string) => `soopnurim:reports:${forestId}`;
const FLAG_KEY = (forestId: string, id: string) => `soopnurim:flags:${forestId}:${id}`;

async function redis(cmd: (string | number)[]) {
  const r = await fetch(URL_, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(cmd),
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`redis ${r.status}`);
  return (await r.json()).result;
}

// ---- 파일/메모리
type Db = Record<string, Record<string, StoredReport>>;
const g = globalThis as unknown as { __snReports?: Db };
const FILE = path.join(process.cwd(), ".data", "reports.json");

async function loadDb(): Promise<Db> {
  if (MODE === "memory") return (g.__snReports ??= {});
  try {
    return JSON.parse(await fs.readFile(FILE, "utf8"));
  } catch {
    return {};
  }
}
async function saveDb(db: Db) {
  if (MODE === "memory") {
    g.__snReports = db;
    return;
  }
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(db, null, 1), "utf8");
}

export async function listReports(forestId: string): Promise<StoredReport[]> {
  let all: StoredReport[];
  if (MODE === "redis") {
    const res: string[] = (await redis(["HVALS", KEY(forestId)])) ?? [];
    all = res.map((s) => JSON.parse(s));
  } else {
    all = Object.values((await loadDb())[forestId] ?? {});
  }
  return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function putReport(r: StoredReport) {
  if (MODE === "redis") {
    await redis(["HSET", KEY(r.forestId), r.id, JSON.stringify(r)]);
    return;
  }
  const db = await loadDb();
  db[r.forestId] = { ...(db[r.forestId] ?? {}), [r.id]: r };
  await saveDb(db);
}

/*
 * 신고 한 건을 원자적으로 처리한다.
 * Redis: 제보 읽기 → 중복 확인(SADD) → 신고 수 증가·숨김 → 저장을 Lua 스크립트 하나로 실행해,
 * 두 사람이 동시에 신고해도 서로 덮어쓰지 않는다.
 * 파일/메모리(개발·시연): 같은 프로세스 안에서 순서대로 처리한다.
 * 반환: "missing" 없는 제보, "already" 이미 신고함, "ok" 반영됨
 */
const FLAG_LUA = `
local s = redis.call('HGET', KEYS[1], ARGV[1])
if not s then return -1 end
local r = cjson.decode(s)
if type(r.flaggedBy) == 'table' then
  for _, v in ipairs(r.flaggedBy) do redis.call('SADD', KEYS[2], v) end
  r.flaggedBy = nil
end
local added = redis.call('SADD', KEYS[2], ARGV[2])
redis.call('EXPIRE', KEYS[2], ARGV[3])
if added == 0 then
  return 0
end
r.flags = (tonumber(r.flags) or 0) + 1
if r.flags >= tonumber(ARGV[4]) then r.hidden = true end
redis.call('HSET', KEYS[1], ARGV[1], cjson.encode(r))
return 1
`;

let chain: Promise<unknown> = Promise.resolve();
function serial<T>(fn: () => Promise<T>): Promise<T> {
  const run = chain.then(fn, fn);
  chain = run.catch(() => undefined);
  return run;
}

export async function flagReport(forestId: string, id: string, who: string): Promise<"missing" | "already" | "ok"> {
  if (MODE === "redis") {
    const res = Number(
      await redis(["EVAL", FLAG_LUA, 2, KEY(forestId), FLAG_KEY(forestId, id), id, who, FLAG_TTL, FLAG_HIDE_AT]),
    );
    return res < 0 ? "missing" : res === 0 ? "already" : "ok";
  }
  return serial(async () => {
    const db = await loadDb();
    const r = db[forestId]?.[id];
    if (!r) return "missing";
    const by = r.flaggedBy ?? [];
    if (by.includes(who)) return "already";
    r.flaggedBy = [...by, who];
    r.flags += 1;
    if (r.flags >= FLAG_HIDE_AT) r.hidden = true;
    await saveDb(db);
    return "ok";
  });
}

/** 관리자 숨김/복구도 같은 이유로 hidden 필드만 원자적으로 바꾼다 */
const HIDE_LUA = `
local s = redis.call('HGET', KEYS[1], ARGV[1])
if not s then return -1 end
local r = cjson.decode(s)
r.hidden = (ARGV[2] == '1')
redis.call('HSET', KEYS[1], ARGV[1], cjson.encode(r))
return 1
`;

export async function setHidden(forestId: string, id: string, hidden: boolean): Promise<boolean> {
  if (MODE === "redis") return Number(await redis(["EVAL", HIDE_LUA, 1, KEY(forestId), id, hidden ? "1" : "0"])) > 0;
  return serial(async () => {
    const db = await loadDb();
    const r = db[forestId]?.[id];
    if (!r) return false;
    r.hidden = hidden;
    await saveDb(db);
    return true;
  });
}

// ---- 아주 단순한 요청 제한 (서버 인스턴스별)
const hits = new Map<string, number[]>();
export function rateLimited(ip: string, max = 8, windowMs = 10 * 60 * 1000) {
  const now = Date.now();
  const arr = (hits.get(ip) ?? []).filter((t) => now - t < windowMs);
  arr.push(now);
  hits.set(ip, arr);
  return arr.length > max;
}

/**
 * 신고자 식별용 비밀값. 운영 환경에서는 FLAG_SALT(32자 이상)를 반드시 따로 설정해야 하고,
 * 없으면 null을 돌려 신고를 받지 않는다. 개발 중에만 고정값을 쓴다.
 */
export function flagSalt(): string | null {
  const s = process.env.FLAG_SALT ?? "";
  if (s.length >= 32) return s;
  return process.env.NODE_ENV === "production" ? null : "dev-only-flag-salt";
}

/** 접속 주소를 그대로 저장하지 않도록 서버 비밀값을 섞어 해시한다 */
export async function visitorKey(ip: string, salt: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${salt}:${ip}`));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 16);
}
