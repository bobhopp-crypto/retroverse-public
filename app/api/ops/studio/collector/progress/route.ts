import { NextResponse } from "next/server";

import { loadCollectorPageContext } from "@/lib/ops/studio/collector/load-dashboard";
import { loadCollectorPackagePageContext } from "@/lib/ops/studio/collector/load-library";

export const dynamic = "force-dynamic";

function opsEnabled(): boolean {
  return process.env.RETROVERSE_OPS === "1";
}

export async function GET(request: Request) {
  if (!opsEnabled()) {
    return NextResponse.json({ ok: false, error: "ops_disabled" }, { status: 403 });
  }

  const rvtr = new URL(request.url).searchParams.get("rvtr");

  if (rvtr) {
    const context = await loadCollectorPackagePageContext(rvtr);
    return NextResponse.json({
      ok: true,
      progress: context.stats.progress,
      stats: context.stats,
      investigation: context.investigation,
      package: context.package,
    });
  }

  const context = await loadCollectorPageContext();

  return NextResponse.json({
    ok: true,
    progress: context.stats.progress,
    stats: context.stats,
    investigation: context.investigation,
    dashboardCard: context.dashboardCard,
    package: context.package,
  });
}
