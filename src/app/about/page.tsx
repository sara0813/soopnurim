import type { Metadata } from "next";
import AboutView from "@/views/AboutView";

export const metadata: Metadata = { title: "소개", alternates: { languages: { en: "/en/about" } } };

export default function About() {
  return <AboutView lang="ko" />;
}
