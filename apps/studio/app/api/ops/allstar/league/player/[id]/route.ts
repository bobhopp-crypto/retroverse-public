import { NextResponse } from "next/server";

import { loadPlayerLeagueProfile } from "@/lib/ops/allstar/league/game-engine";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  if (!isOpsEnabled()) return new NextResponse("Not found", { status: 404 });

  const { id } = await params;
  const profile = await loadPlayerLeagueProfile(id);
  return NextResponse.json(profile);
}
