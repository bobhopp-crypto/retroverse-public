import { NextResponse } from "next/server";

import {
  battingLeaders,
  pitchingLeaders,
  recalculateSeasonStats,
  teamStandings,
} from "@/lib/ops/allstar/league/game-engine";
import { loadLeagueStore, saveLeagueStore } from "@/lib/ops/allstar/league/storage";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  if (!isOpsEnabled()) return new NextResponse("Not found", { status: 404 });

  const url = new URL(req.url);
  const seasonId = url.searchParams.get("seasonId");
  const store = await loadLeagueStore();
  const sid = seasonId ?? store.seasons.find((s) => s.status === "active")?.id ?? null;

  return NextResponse.json({
    seasonId: sid,
    standings: sid ? teamStandings(store, sid) : [],
    batting: {
      avg: sid ? battingLeaders(store, sid, "AVG", 1).slice(0, 10) : [],
      hr: sid ? battingLeaders(store, sid, "HR", 0).slice(0, 10) : [],
      rbi: sid ? battingLeaders(store, sid, "RBI", 0).slice(0, 10) : [],
      h: sid ? battingLeaders(store, sid, "H", 0).slice(0, 10) : [],
      obp: sid ? battingLeaders(store, sid, "OBP", 1).slice(0, 10) : [],
      slg: sid ? battingLeaders(store, sid, "SLG", 1).slice(0, 10) : [],
      ops: sid ? battingLeaders(store, sid, "OPS", 1).slice(0, 10) : [],
      so: sid ? battingLeaders(store, sid, "SO", 0).slice(0, 10) : [],
    },
    pitching: {
      w: sid ? pitchingLeaders(store, sid, "W", 0).slice(0, 10) : [],
      l: sid ? pitchingLeaders(store, sid, "L", 0).slice(0, 10) : [],
      era: sid ? pitchingLeaders(store, sid, "ERA", 0.1).slice(0, 10) : [],
      ip: sid ? pitchingLeaders(store, sid, "IP", 0).slice(0, 10) : [],
      so: sid ? pitchingLeaders(store, sid, "SO", 0).slice(0, 10) : [],
      bb: sid ? pitchingLeaders(store, sid, "BB", 0).slice(0, 10) : [],
    },
    playerStats: sid ? store.playerStats.filter((p) => p.seasonId === sid) : store.playerStats,
  });
}

export async function POST(req: Request) {
  if (!isOpsEnabled()) return new NextResponse("Not found", { status: 404 });

  const body = (await req.json()) as { seasonId?: string };
  const store = await loadLeagueStore();
  const seasonId =
    body.seasonId ?? store.seasons.find((s) => s.status === "active")?.id ?? store.seasons[0]?.id;

  if (!seasonId) {
    return NextResponse.json({ ok: false, error: "No season found" }, { status: 400 });
  }

  const updated = recalculateSeasonStats(store, seasonId);
  await saveLeagueStore(updated);
  return NextResponse.json({ ok: true, seasonId });
}
