import { NextResponse } from "next/server";

import { pickThemedTourSlice } from "@/lib/retroverse/experience/attract-themes";
import { buildAttractTourPool } from "@/lib/retroverse/experience/attract-tour-pool";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const seedParam = url.searchParams.get("seed");
  const themeParam = url.searchParams.get("theme");
  const parsed = seedParam ? Number(seedParam) : NaN;
  const sessionSeed =
    Number.isFinite(parsed) && parsed > 0
      ? Math.floor(parsed)
      : Math.floor(Math.random() * 1_000_000_000);
  const themeIndex = themeParam ? Math.max(0, Math.floor(Number(themeParam))) : 0;

  try {
    const pool = await buildAttractTourPool(sessionSeed);
    const slice = pickThemedTourSlice(pool.entries, themeIndex, sessionSeed);
    return NextResponse.json({
      ...pool,
      theme: slice?.theme ?? null,
      startRvtr: slice?.songs[0]?.rvtr ?? pool.entries[0]?.rvtr ?? null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Pool build failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
