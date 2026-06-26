import { NextResponse } from "next/server";

import { buildCollectionIntelligence } from "@/lib/ops/allstar/intelligence/load-intelligence";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  if (!isOpsEnabled()) {
    return new NextResponse("Not found", { status: 404 });
  }

  const intelligence = await buildCollectionIntelligence();
  return NextResponse.json(intelligence);
}
