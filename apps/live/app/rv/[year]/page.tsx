import { notFound } from "next/navigation";

import { isUsableChartHistory } from "@/lib/artist/chart-history";
import { loadRvYearChartHistory } from "@/lib/artist/load-chart-history";
import {
  buildRvYearDestination,
  enrichRvYearDestination,
} from "@/lib/rv-year/enrich-rv-year-destination";
import { normalizeRVYear } from "@/lib/search/normalize-rv-year";

import { RvYearView } from "./rv-year-view";
import { Rv2ChronologyFrame } from "../components/rv2-chronology-frame";

import "./rv-year.css";

type Props = {
  params: Promise<{ year: string }>;
};

export const revalidate = 3600;

export async function generateMetadata({ params }: Props) {
  const rvYear = normalizeRVYear((await params).year);
  return {
    title: rvYear != null ? `${rvYear} — RetroVerse Year` : "RV Year — RetroVerse",
  };
}

export default async function RvYearPage({ params }: Props) {
  const rvYear = normalizeRVYear((await params).year);
  if (rvYear == null) notFound();

  const history = await loadRvYearChartHistory(rvYear);
  if (!history || !isUsableChartHistory(history)) notFound();

  const destination = await enrichRvYearDestination(buildRvYearDestination(history, rvYear));

  return (
    <Rv2ChronologyFrame rvYear={rvYear}>
      <RvYearView rvYear={rvYear} history={history} destination={destination} shellMode="rv2" />
    </Rv2ChronologyFrame>
  );
}
