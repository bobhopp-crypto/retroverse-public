import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AtlasCollectorViewer } from "@/components/atlas/AtlasCollectorViewer";
import { loadCollectorAtlasViewer } from "@/lib/atlas/load-collector-atlas-viewer";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Atlas Library — Collected Songs",
  robots: { index: false, follow: false },
};

export default async function AtlasLibraryPage() {
  if (!isOpsEnabled()) notFound();

  const data = await loadCollectorAtlasViewer();

  return <AtlasCollectorViewer data={data} />;
}
