import { NextResponse } from "next/server";

import { coverApplyEnabled } from "@/lib/rv12/guardrails";
import {
  getActiveAssignment,
  listPromotionAudit,
  listRv12Assets,
} from "@/lib/rv12/ledger";
import { loadAlbumByRval } from "@/lib/rv12/load-album";
import { isOpsEnabled } from "@/lib/ops/ops-gate";
import { isPilotRval } from "@/lib/rv12/paths";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isOpsEnabled()) {
    return NextResponse.json({ ok: false, error: "disabled" }, { status: 404 });
  }

  const rval = new URL(request.url).searchParams.get("rval")?.trim().toUpperCase();
  if (!rval) {
    return NextResponse.json({ ok: false, error: "rval required" }, { status: 400 });
  }

  const [album, assets, assignment, audit] = await Promise.all([
    loadAlbumByRval(rval),
    listRv12Assets(),
    getActiveAssignment(rval),
    listPromotionAudit(rval),
  ]);

  return NextResponse.json({
    ok: true,
    rval,
    isPilot: isPilotRval(rval),
    coverApplyEnabled: coverApplyEnabled(),
    album,
    assets,
    activeAssignment: assignment,
    promotionAudit: audit,
  });
}
