import { NextResponse } from "next/server";

import { buildCollectionAudit } from "@/lib/ops/allstar/collection-audit";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  if (!isOpsEnabled()) {
    return new NextResponse("Not found", { status: 404 });
  }

  const audit = await buildCollectionAudit();
  return NextResponse.json(audit);
}
