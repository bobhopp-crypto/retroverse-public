import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AiUsageDashboard } from "@/components/bobos/ai-usage/AiUsageDashboard";
import { loadAiUsageEntries } from "@/lib/bobos/ai-usage/store";
import { shouldAllowOpsRoutes } from "@/lib/runtime/site-mode";

export const metadata: Metadata = {
  title: "BobOS AI Usage",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function BobosAiUsagePage() {
  if (!shouldAllowOpsRoutes()) notFound();

  const entries = await loadAiUsageEntries();

  return <AiUsageDashboard initialEntries={entries} />;
}
