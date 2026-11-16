import raw from "@/data/forests.json";
import Explorer, { type NanumPoint } from "@/components/Explorer";
import { FORESTS, summarize } from "@/lib/journey";

export default function Home() {
  const forests = FORESTS.map(summarize);
  const nanum = (raw as unknown as { nanumAll: NanumPoint[] }).nanumAll;
  return <Explorer forests={forests} nanum={nanum} />;
}
