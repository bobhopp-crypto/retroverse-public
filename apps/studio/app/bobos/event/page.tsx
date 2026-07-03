import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BobosEventHubView } from "@/components/bobos/event/BobosEventHubView";
import { loadProductionBinder } from "@/lib/ops/event-studio/production-binder";
import { shouldAllowOpsRoutes } from "@/lib/runtime/site-mode";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Event Hub — BobOS",
  robots: { index: false, follow: false },
};

export default async function BobosEventHubPage() {
  if (!shouldAllowOpsRoutes()) notFound();

  const binder = await loadProductionBinder();

  return <BobosEventHubView binder={binder} />;
}
