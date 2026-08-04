import { NextResponse } from "next/server";

import {
  ensureMagazineHeroFrame,
  isMagazineHomepageBenchmark,
  listMagazineHeroFrameCandidates,
} from "@/lib/ops/issue-generation/magazine-hero-frame";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!isOpsEnabled()) return new NextResponse("Not found", { status: 404 });
  const rvtr = new URL(request.url).searchParams.get("rvtr")?.toUpperCase();
  if (!rvtr || !/^RVTR\d{6}$/.test(rvtr) || !isMagazineHomepageBenchmark(rvtr)) {
    return new NextResponse("Not found", { status: 404 });
  }

  await ensureMagazineHeroFrame(rvtr);
  const [current, candidates] = await Promise.all([
    ensureMagazineHeroFrame(rvtr),
    listMagazineHeroFrameCandidates(rvtr),
  ]);

  return NextResponse.json({
    rvtr,
    current,
    candidates,
  });
}
