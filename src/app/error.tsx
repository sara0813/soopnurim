"use client";
import Link from "next/link";
import { useEffect } from "react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="card mx-auto max-w-lg space-y-3 p-6 text-center">
      <h1 className="text-2xl font-bold">화면을 불러오지 못했습니다</h1>
      <p className="text-muted">잠시 뒤 다시 시도해 주세요. 계속되면 숲 찾기 화면에서 다시 들어와 주세요.</p>
      <div className="flex flex-wrap justify-center gap-2">
        <button type="button" className="btn btn-primary" onClick={reset}>
          다시 시도
        </button>
        <Link href="/" className="btn btn-outline">
          숲 찾기로 돌아가기
        </Link>
      </div>
    </div>
  );
}
