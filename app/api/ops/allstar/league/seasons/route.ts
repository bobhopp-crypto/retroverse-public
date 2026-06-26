import { NextResponse } from "next/server";

import { createSeason } from "@/lib/ops/allstar/league/game-engine";
import { loadLeagueStore } from "@/lib/ops/allstar/league/storage";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  if (!isOpsEnabled()) return new NextResponse("Not found", { status: 404 });
  const store = await loadLeagueStore();
  return NextResponse.json({ seasons: store.seasons });
}

export async function POST(req: Request) {
  if (!isOpsEnabled()) return new NextResponse("Not found", { status: 404 });

  const body = (await req.json()) as { name?: string };
  if (!body.name?.trim()) {
    return NextResponse.json({ ok: false, error: "Season name required" }, { status: 400 });
  }

  const season = await createSeason(body.name.trim());
  return NextResponse.json({ ok: true, season });
}
