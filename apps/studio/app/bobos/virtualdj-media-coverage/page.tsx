import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { redirect } from "next/navigation";

import { VirtualDjMediaCoverage } from "@/components/bobos/virtualdj-media-coverage/VirtualDjMediaCoverage";
import { OPS_GATE_COOKIE } from "@/lib/ops/ops-gate";
import { shouldAllowOpsRoutes } from "@/lib/runtime/site-mode";

import "@/components/bobos/virtualdj-media-coverage/media-coverage.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "VirtualDJ Media Coverage — BobOS",
  robots: { index: false, follow: false },
};

export default async function VirtualDjMediaCoveragePage() {
  if (!shouldAllowOpsRoutes()) notFound();
  const cookieStore = await cookies();
  if (cookieStore.get(OPS_GATE_COOKIE)?.value !== "ok") {
    redirect(`/internal/ops-pin?next=${encodeURIComponent("/bobos/virtualdj-media-coverage")}`);
  }
  return <VirtualDjMediaCoverage />;
}
