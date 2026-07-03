import { NextResponse } from "next/server";

import { battingLeaders, pitchingLeaders, teamStandings } from "@/lib/ops/allstar/league/game-engine";
import { loadLeagueStore } from "@/lib/ops/allstar/league/storage";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  if (!isOpsEnabled()) return new NextResponse("Not found", { status: 404 });

  const store = await loadLeagueStore();
  const activeSeason = store.seasons.find((s) => s.status === "active") ?? store.seasons[0] ?? null;

  return NextResponse.json({
    seasons: store.seasons,
    games: store.games,
    activeSeasonId: activeSeason?.id ?? null,
    standings: activeSeason ? teamStandings(store, activeSeason.id) : [],
    battingLeaders: activeSeason ? battingLeaders(store, activeSeason.id, "AVG", 1) : [],
    pitchingLeaders: activeSeason ? pitchingLeaders(store, activeSeason.id, "ERA", 0) : [],
  });
}
