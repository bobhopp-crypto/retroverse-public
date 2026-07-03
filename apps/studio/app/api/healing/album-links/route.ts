import { NextResponse } from "next/server";

import { isControlCenterEnabled } from "@/lib/control-center/dev-gate";
import { auditTrackAlbumLinks } from "@/lib/track/album-link-recovery/audit-track";
import { runAlbumLinkRecoveryAudit } from "@/lib/track/album-link-recovery/audit-missing-links";

export const dynamic = "force-dynamic";

/** Dev-only preview — no writes. */
export async function GET(request: Request) {
  if (!isControlCenterEnabled()) {
    return NextResponse.json({ ok: false, error: "Healing API disabled" }, { status: 403 });
  }

  const url = new URL(request.url);
  const rvtr = url.searchParams.get("rvtr")?.trim();

  try {
    if (rvtr) {
      const audit = await auditTrackAlbumLinks(rvtr);
      if (!audit) {
        return NextResponse.json({ ok: false, error: "Track not found" }, { status: 404 });
      }
      return NextResponse.json({ ok: true, audit });
    }

    const report = await runAlbumLinkRecoveryAudit({
      sampleCount: Number(url.searchParams.get("sample") ?? 5),
      fixedRvtrs: ["RVTR430551", "RVTR336241"],
    });
    return NextResponse.json({ ok: true, report });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
