import { NextResponse } from "next/server";

import { loadRetroverseMap, saveRetroverseMap, type RetroverseMapCard } from "@/lib/ops/retroverse-map-store";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isOpsEnabled()) {
    return NextResponse.json({ ok: false, error: "ops_disabled" }, { status: 403 });
  }

  const map = await loadRetroverseMap();
  return NextResponse.json({ ok: true, map });
}

export async function PUT(req: Request) {
  if (!isOpsEnabled()) {
    return NextResponse.json({ ok: false, error: "ops_disabled" }, { status: 403 });
  }

  let body: { cards?: RetroverseMapCard[] };
  try {
    body = (await req.json()) as { cards?: RetroverseMapCard[] };
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  if (!Array.isArray(body.cards)) {
    return NextResponse.json({ ok: false, error: "cards_required" }, { status: 400 });
  }

  const map = await saveRetroverseMap(body.cards);
  return NextResponse.json({ ok: true, map });
}
