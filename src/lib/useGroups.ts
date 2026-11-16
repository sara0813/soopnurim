"use client";
import { useCallback, useSyncExternalStore } from "react";
import type { Group } from "./types";

const KEY = "soopnurim.groups";
const listeners = new Set<() => void>();
let cache: Group[] | null = null;
const EMPTY: Group[] = [];

function read(): Group[] {
  if (cache) return cache;
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "[]");
    cache = Array.isArray(v) ? (v.filter((x) => ["wheelchair", "elder", "child"].includes(x)) as Group[]) : [];
  } catch {
    cache = [];
  }
  return cache;
}

function write(v: Group[]) {
  cache = v;
  try {
    localStorage.setItem(KEY, JSON.stringify(v));
  } catch {
    /* 저장 불가 환경에서도 동작 */
  }
  listeners.forEach((l) => l());
}

export function useGroups() {
  const groups = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    read,
    () => EMPTY,
  );
  const toggle = useCallback((g: Group) => {
    const cur = read();
    write(cur.includes(g) ? cur.filter((x) => x !== g) : [...cur, g]);
  }, []);
  return { groups, toggle, setGroups: write };
}
