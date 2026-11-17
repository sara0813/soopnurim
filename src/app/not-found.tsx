"use client";
import Link from "next/link";
import { href } from "@/lib/i18n";
import { useLang } from "@/lib/useLang";

export default function NotFound() {
  const { lang, t } = useLang();
  return (
    <div className="card mx-auto max-w-lg space-y-3 p-6 text-center">
      <h1 className="text-2xl font-bold">{t("페이지를 찾을 수 없습니다", "Page not found")}</h1>
      <p className="text-muted">
        {t("주소가 바뀌었거나 없는 휴양림일 수 있습니다.", "The address may have changed, or the forest may not exist.")}
      </p>
      <Link href={href(lang, "/")} className="btn btn-primary">
        {t("숲 찾기로 돌아가기", "Back to forest search")}
      </Link>
    </div>
  );
}
