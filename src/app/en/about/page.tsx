import type { Metadata } from "next";
import AboutView from "@/views/AboutView";

export const metadata: Metadata = { title: "About", alternates: { languages: { ko: "/about" } } };

export default function About() {
  return <AboutView lang="en" />;
}
