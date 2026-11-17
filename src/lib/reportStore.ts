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
  /** 신고한 이용자(접속 주소의 솔트 해시 앞 16자). 같은 사람의 중복 신고를 막는 데만 쓰고 공개하지 않는다 */
  flaggedBy?: string[];
}

const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "";
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "";
export const MODE: "redis" | "file" | "memory" = URL_ && TOKEN ? "redis" : process.env.NODE_ENV === "production" ? "memory" : "file";

const KEY = (forestId: string) => `soopnurim:reports:${forestId}`;

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

export async function getReport(forestId: string, id: string): Promise<StoredReport | null> {
  if (MODE === "redis") {
    const s: string | null = await redis(["HGET", KEY(forestId), id]);
    return s ? JSON.parse(s) : null;
  }
  return (await loadDb())[forestId]?.[id] ?? null;
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

// ---- 아주 단순한 요청 제한 (서버 인스턴스별)
const hits = new Map<string, number[]>();
export function rateLimited(ip: string, max = 8, windowMs = 10 * 60 * 1000) {
  const now = Date.now();
  const arr = (hits.get(ip) ?? []).filter((t) => now - t < windowMs);
  arr.push(now);
  hits.set(ip, arr);
  return arr.length > max;
}

/** 접속 주소를 그대로 저장하지 않도록 서버 비밀값을 섞어 해시한다 */
export async function visitorKey(ip: string) {
  const salt = process.env.FLAG_SALT || process.env.ADMIN_TOKEN || "soopnurim";
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${salt}:${ip}`));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 16);
}
