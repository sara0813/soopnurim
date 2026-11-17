import type { Metadata } from "next";
import GapsView from "@/views/GapsView";

export const metadata: Metadata = { title: "전국 정보 빈칸 통계", alternates: { languages: { en: "/en/gaps" } } };

export default function GapsPage() {
  return <GapsView lang="ko" />;
}
