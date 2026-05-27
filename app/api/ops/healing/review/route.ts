import { NextResponse } from "next/server";

import { auditCoverForRvtr } from "@/lib/healing/cover-audit";
import { loadHealingReviewSet } from "@/lib/healing/load-review-set";
import type { HealingClusterId } from "@/lib/healing/types";
import { auditTrackAlbumLinks } from "@/lib/track/album-link-recovery/audit-track";
import { healingWritesEnabled } from "@/lib/track/album-link-recovery/guardrails";

export const dynamic = "force-dynamic";

function parseCluster(value: string | null): HealingClusterId {
  if (value === "degraded_sample") return "degraded_sample";
  return "stand_by_me";
}

/** Ops healing review — preview only on GET. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const rvtr = url.searchParams.get("rvtr")?.trim();

  try {
    if (rvtr) {
      const [audit, cover] = await Promise.all([
        auditTrackAlbumLinks(rvtr),
        auditCoverForRvtr(rvtr),
      ]);
      if (!audit) {
        return NextResponse.json({ ok: false, error: "Track not found" }, { status: 404 });
      }
      return NextResponse.json({
        ok: true,
        audit,
        cover,
        writesEnabled: healingWritesEnabled(),
      });
    }

    const cluster = parseCluster(url.searchParams.get("cluster"));
    const review = await loadHealingReviewSet(cluster);
    return NextResponse.json({
      ok: true,
      review,
      writesEnabled: healingWritesEnabled(),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
