import type { Metadata } from "next";
import DataView from "@/views/DataView";

export const metadata: Metadata = { title: "데이터 출처와 가공 방법", alternates: { languages: { en: "/en/data" } } };

export default function DataPage() {
  return <DataView lang="ko" />;
}
