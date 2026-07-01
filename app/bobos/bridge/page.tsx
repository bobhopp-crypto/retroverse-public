import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { BobosBridgeView } from "@/components/bobos/bridge/BobosBridgeView";
import {
  defaultBridgeRvtr,
  loadBridgeView,
} from "@/lib/bobos/bridge/load-bridge-view";
import { normalizePackageRvtr } from "@/lib/ops/intelligence/song-package-store";
import { shouldAllowOpsRoutes } from "@/lib/runtime/site-mode";

export const metadata: Metadata = {
  title: "Bridge View — BobOS",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ rvtr?: string }>;
};

export default async function BobosBridgePage({ searchParams }: Props) {
  if (!shouldAllowOpsRoutes()) notFound();

  const params = await searchParams;
  const requested = params.rvtr ? normalizePackageRvtr(params.rvtr) : null;
  const rvtr = requested ?? (await defaultBridgeRvtr());

  if (!rvtr) {
    return <BobosBridgeView initial={null} initialRvtr={null} />;
  }

  if (!requested) {
    redirect(`/bobos/bridge?rvtr=${encodeURIComponent(rvtr)}`);
  }

  const model = await loadBridgeView(rvtr);

  return <BobosBridgeView initial={model} initialRvtr={rvtr} />;
}
