import raw from "@/data/forests.json";
import Explorer from "@/components/Explorer";
import { FORESTS, SOURCES, summarize } from "@/lib/journey";
import type { NanumPoint, ToiletPoint } from "@/lib/types";

export default function Home() {
  const forests = FORESTS.map(summarize);
  const data = raw as unknown as { nanumAll: NanumPoint[]; toiletLayer: ToiletPoint[] };
  const total = Object.keys(SOURCES).length;
  return (
    <Explorer
      forests={forests}
      nanum={data.nanumAll}
      toilets={data.toiletLayer}
      datasetCount={total}
    />
  );
}
