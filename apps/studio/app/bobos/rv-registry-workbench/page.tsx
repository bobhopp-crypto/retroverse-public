import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { RvRegistryWorkbench } from "@/components/bobos/rv-registry-workbench/RvRegistryWorkbench";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "RV Registry Workbench — BobOS",
  description: "Temporary architectural light table for reviewing every BobOS application.",
  robots: { index: false, follow: false },
};

export default function RvRegistryWorkbenchPage() {
  if (!isOpsEnabled()) {
    notFound();
  }

  return <RvRegistryWorkbench />;
}
