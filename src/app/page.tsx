import type { Metadata } from "next";
import raw from "@/data/forests.json";
import Explorer from "@/components/Explorer";
import { DATASET_COUNT, FORESTS, pickExample, summarize } from "@/lib/journey";
import type { NanumPoint, ToiletPoint } from "@/lib/types";

export const metadata: Metadata = { alternates: { languages: { en: "/en" } } };

export default function Home() {
  const forests = FORESTS.map(summarize);
  const data = raw as unknown as { nanumAll: NanumPoint[]; toiletLayer: ToiletPoint[] };
  return (
    <Explorer
      forests={forests}
      nanum={data.nanumAll}
      toilets={data.toiletLayer}
      datasetCount={DATASET_COUNT}
      exampleId={pickExample(forests)}
    />
  );
}
