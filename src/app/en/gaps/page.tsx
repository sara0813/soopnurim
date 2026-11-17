import type { Metadata } from "next";
import GapsView from "@/views/GapsView";

export const metadata: Metadata = { title: "Information gaps", alternates: { languages: { ko: "/gaps" } } };

export default function GapsPage() {
  return <GapsView lang="en" />;
}
