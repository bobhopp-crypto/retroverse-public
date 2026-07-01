import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AtlasArchitectureView } from "@/components/atlas/AtlasArchitectureView";
import { ATLAS_ARCHITECTURE } from "@/lib/atlas/architecture-content";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Architecture — Atlas Encyclopedia",
  robots: { index: false, follow: false },
};

export default function AtlasArchitecturePage() {
  if (!isOpsEnabled()) notFound();

  return <AtlasArchitectureView doc={ATLAS_ARCHITECTURE} />;
}
