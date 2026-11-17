import type { Metadata } from "next";
import ForestView, { forestTitle } from "@/views/ForestView";
import { FORESTS } from "@/lib/journey";

export function generateStaticParams() {
  return FORESTS.map((f) => ({ id: f.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return { title: forestTitle(id, "en"), alternates: { languages: { ko: `/forest/${id}` } } };
}

export default async function ForestPageEn({ params }: { params: Promise<{ id: string }> }) {
  return <ForestView id={(await params).id} lang="en" />;
}
