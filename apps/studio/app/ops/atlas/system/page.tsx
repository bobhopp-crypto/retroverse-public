import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AtlasSystemMapView } from "@/components/atlas/AtlasSystemMapView";
import { loadSystemMap } from "@/lib/atlas/system-map/load-system-map";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "System Map — Atlas Operations",
  robots: { index: false, follow: false },
};

export default async function AtlasSystemPage() {
  if (!isOpsEnabled()) notFound();

  const map = await loadSystemMap();

  return <AtlasSystemMapView map={map} />;
}
