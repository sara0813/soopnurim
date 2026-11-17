import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { absolute: "Soopnurim – check before your forest stay", template: "%s | Soopnurim" },
  description:
    "Soopnurim links Korean forest open data from booking to rooms, toilets, trails and safety, with sources and dates, for wheelchair users, older adults, families with young children and foreign visitors.",
  applicationName: "Soopnurim",
};

/** 영어 화면: 본문 언어를 영어로 표시 (머리말·꼬리말은 경로를 보고 영어로 바뀐다) */
export default function EnLayout({ children }: { children: React.ReactNode }) {
  return (
    <div lang="en">
      <script dangerouslySetInnerHTML={{ __html: "document.documentElement.lang='en'" }} />
      {children}
    </div>
  );
}
