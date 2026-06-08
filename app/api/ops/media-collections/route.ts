import { NextResponse } from "next/server";

import { ensureMediaCollectionsInitialized } from "@/lib/ops/media-collections/init";
import { loadMediaCollectionsConsole } from "@/lib/ops/media-collections/load";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function opsEnabled(): boolean {
  return process.env.RETROVERSE_OPS === "1";
}

export async function GET() {
  if (!opsEnabled()) {
    return NextResponse.json({ error: "Ops disabled" }, { status: 403 });
  }

  await ensureMediaCollectionsInitialized();
  const data = await loadMediaCollectionsConsole();
  return NextResponse.json({ ok: true, ...data });
}
