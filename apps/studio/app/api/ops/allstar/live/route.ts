import { NextResponse } from "next/server";

import { buildLiveArchive } from "@/lib/ops/allstar/build-live-archive";
import { loadAllStarSnapshot } from "@/lib/ops/allstar/load-allstar";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  if (!isOpsEnabled()) {
    return new NextResponse("Not found", { status: 404 });
  }

  const snapshot = await loadAllStarSnapshot();
  const live = await buildLiveArchive(snapshot);
  return NextResponse.json(live);
}
