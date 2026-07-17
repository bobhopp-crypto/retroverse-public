import type { Metadata } from "next";

import { ProductionCurationStudio } from "./ProductionCurationStudio";
import "./production-curation.css";
import { loadProductionVideoData } from "./load-production-video-data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Curation Studio - Retroverse Ops",
  robots: { index: false, follow: false },
};

export default async function CurationPage() {
  const data = loadProductionVideoData();
  return <ProductionCurationStudio data={data} />;
}
