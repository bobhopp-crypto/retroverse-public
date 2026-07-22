import { NextResponse } from "next/server";

import { loadBoothShow } from "@/lib/bobos/booth/program-control";
import { shouldAllowOpsRoutes } from "@/lib/runtime/site-mode";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  if (!shouldAllowOpsRoutes()) {
    return NextResponse.json({ error: "The Booth is localhost-only." }, { status: 403 });
  }

  const result = await loadBoothShow();
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 409 });
  }

  return NextResponse.json({
    ok: true,
    published: false,
    view: result.view,
  });
}
