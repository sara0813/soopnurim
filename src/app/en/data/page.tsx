import type { Metadata } from "next";
import DataView from "@/views/DataView";

export const metadata: Metadata = { title: "Data sources", alternates: { languages: { ko: "/data" } } };

export default function DataPage() {
  return <DataView lang="en" />;
}
