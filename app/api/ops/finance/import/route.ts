import { NextResponse } from "next/server";

import { isOpsEnabled } from "@/lib/ops/ops-gate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

/** @deprecated Use preview → review → reconcile → post workflow. */
export async function POST(request: Request) {
  if (!isOpsEnabled()) {
    return NextResponse.json({ error: "Ops disabled" }, { status: 404 });
  }

  return NextResponse.json(
    {
      error:
        "Direct import disabled. Upload at /ops/finance/import, then Review → Reconcile → Post.",
    },
    { status: 400 },
  );
}
