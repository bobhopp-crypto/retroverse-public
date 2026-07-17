import { notFound } from "next/navigation";

import { isUsableChartHistory } from "@/lib/artist/chart-history";
import { loadRvYearChartHistory } from "@/lib/artist/load-chart-history";
import {
  buildRvYearDestination,
  enrichRvYearDestination,
} from "@/lib/rv-year/enrich-rv-year-destination";
import { rvYearEditorial } from "@/lib/rv-year/rv-year-editorial";
import { resolveCanonicalYear } from "@/lib/public/canonical-public-resolver";
import { CanonicalPublicTrace } from "@/components/public/CanonicalPublicTrace";
import { discoverySourcesForPage } from "@/lib/public/discovery-contract";
import { localPublicTraceEnabled, timePublicLoader } from "@/lib/public/local-trace";

import { RvYearView } from "./rv-year-view";
import { Rv2ChronologyFrame } from "../components/rv2-chronology-frame";

import "./rv-year.css";
import "../components/rv-rv2-overrides.css";

type Props = {
  params: Promise<{ year: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export const revalidate = 3600;

export async function generateMetadata({ params }: Props) {
  const canonical = resolveCanonicalYear((await params).year);
  if (!canonical) {
    return { title: "RV Year — RetroVerse" };
  }
  const rvYear = canonical.year;
  const editorial = rvYearEditorial(rvYear);
  return {
    title: `${rvYear} — ${editorial.headline} — RetroVerse Year`,
    description: editorial.lead,
  };
}

export default async function RvYearPage({ params, searchParams }: Props) {
  const canonical = resolveCanonicalYear((await params).year);
  if (!canonical) notFound();
  const rvYear = canonical.year;
  const traceEnabled = localPublicTraceEnabled(searchParams ? await searchParams : undefined);

  const historyLoad = await timePublicLoader("year-chart-history", () => loadRvYearChartHistory(rvYear));
  if (!historyLoad.value || !isUsableChartHistory(historyLoad.value)) notFound();

  const destinationLoad = await timePublicLoader("year-destination", () =>
    enrichRvYearDestination(buildRvYearDestination(historyLoad.value!, rvYear)),
  );

  return (
    <>
    <Rv2ChronologyFrame rvYear={rvYear}>
      <RvYearView rvYear={rvYear} history={historyLoad.value} destination={destinationLoad.value} shellMode="rv2" />
    </Rv2ChronologyFrame>
    <CanonicalPublicTrace
      enabled={traceEnabled}
      resolverPath={canonical.resolverPath}
      discoverySources={discoverySourcesForPage("year")}
      loaderTimings={[historyLoad.timing, destinationLoad.timing]}
    />
    </>
  );
}
