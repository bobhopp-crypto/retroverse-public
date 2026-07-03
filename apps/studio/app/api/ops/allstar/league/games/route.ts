import { NextResponse } from "next/server";

import { createGameInStore, finalizeGame, saveGameDraft } from "@/lib/ops/allstar/league/game-engine";
import { loadLeagueStore } from "@/lib/ops/allstar/league/storage";
import type { BobLeagueGame } from "@/lib/ops/allstar/league/types";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  if (!isOpsEnabled()) return new NextResponse("Not found", { status: 404 });

  const url = new URL(req.url);
  const seasonId = url.searchParams.get("seasonId");
  const store = await loadLeagueStore();
  const games = seasonId ? store.games.filter((g) => g.seasonId === seasonId) : store.games;

  return NextResponse.json({ games });
}

export async function POST(req: Request) {
  if (!isOpsEnabled()) return new NextResponse("Not found", { status: 404 });

  const body = (await req.json()) as Partial<BobLeagueGame> & { action?: string };

  if (body.action === "finalize" && body.id) {
    const game = await finalizeGame(body.id);
    return NextResponse.json({ ok: true, game });
  }

  if (body.id && body.boxScore) {
    const game = await saveGameDraft(body as BobLeagueGame);
    return NextResponse.json({ ok: true, game });
  }

  if (!body.seasonId || !body.awayTeam || !body.homeTeam) {
    return NextResponse.json({ ok: false, error: "seasonId, awayTeam, homeTeam required" }, { status: 400 });
  }

  const game = await createGameInStore({
    seasonId: body.seasonId,
    date: body.date ?? new Date().toISOString().slice(0, 10),
    mode: body.mode ?? "manual",
    awayTeam: body.awayTeam,
    homeTeam: body.homeTeam,
    innings: body.innings ?? 9,
  });

  return NextResponse.json({ ok: true, game });
}
