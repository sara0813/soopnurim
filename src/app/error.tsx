"use client";
import Link from "next/link";
import { useEffect } from "react";
import { href } from "@/lib/i18n";
import { useLang } from "@/lib/useLang";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { lang, t } = useLang();
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="card mx-auto max-w-lg space-y-3 p-6 text-center">
      <h1 className="text-2xl font-bold">{t("화면을 불러오지 못했습니다", "Could not load this page")}</h1>
      <p className="text-muted">
        {t(
          "잠시 뒤 다시 시도해 주세요. 계속되면 숲 찾기 화면에서 다시 들어와 주세요.",
          "Please try again shortly. If it keeps happening, go back to forest search and open it again.",
        )}
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <button type="button" className="btn btn-primary" onClick={reset}>
          {t("다시 시도", "Try again")}
        </button>
        <Link href={href(lang, "/")} className="btn btn-outline">
          {t("숲 찾기로 돌아가기", "Back to forest search")}
        </Link>
      </div>
    </div>
  );
}
